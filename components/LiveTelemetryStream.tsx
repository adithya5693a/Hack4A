"use client";

import { useState, useRef, useEffect } from "react";
import {
  Activity,
  Trash2,
  ChevronDown,
  Bot,
  Wrench,
  Search,
  Lock,
  AlertTriangle,
  Layers,
} from "lucide-react";
import type { TelemetryEvent, TelemetryStatus } from "@/types/telemetry";
import { summariseArgs } from "@/types/telemetry";
import StatusBadge from "./StatusBadge";
import RiskScoreBar from "./RiskScoreBar";

interface LiveTelemetryStreamProps {
  events: TelemetryEvent[];
  onClear: () => void;
  onSelectForReview?: (event: TelemetryEvent) => void;
  isOnline?: boolean;
}

export default function LiveTelemetryStream({
  events,
  onClear,
  onSelectForReview,
  isOnline = true,
}: LiveTelemetryStreamProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TelemetryStatus | "ALL">("ALL");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new events arrive, if user hasn't scrolled down
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const isAtTop = scrollContainerRef.current.scrollTop < 25;
      setAutoScroll(isAtTop);
    }
  };

  // Filter events based on search query & status filter
  const filteredEvents = events.filter((evt) => {
    if (statusFilter !== "ALL" && evt.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        evt.id.toLowerCase().includes(q) ||
        evt.agent_id.toLowerCase().includes(q) ||
        evt.tool_name.toLowerCase().includes(q) ||
        evt.args.toLowerCase().includes(q) ||
        (evt.rule_id && evt.rule_id.toLowerCase().includes(q)) ||
        (evt.diagnosis && evt.diagnosis.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-charcoal rounded-xl border border-forest shadow-[0_0_25px_rgba(6,17,12,0.9)] overflow-hidden font-mono">
      {/* Stream Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-neutral-800/80 bg-neutral-900/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest border border-crimson/50 shadow-[0_0_10px_rgba(163,28,24,0.3)]">
            <Activity className="h-3.5 w-3.5 text-crimson animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide text-neutral-100 uppercase flex items-center gap-2">
              Live Agent Activity Feed
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson" />
              </span>
            </h2>
            <p className="text-[10px] text-neutral-400">
              Real-time monitoring of all agent tool requests and guardrail decisions.
            </p>
          </div>
        </div>

        {/* Action and Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search agent, tool, rule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 sm:w-56 pl-8 pr-2.5 py-1 text-xs bg-neutral-950/70 border border-neutral-800 rounded-lg text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-crimson transition-colors duration-100"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center rounded-lg bg-neutral-950/70 p-0.5 border border-neutral-800">
            {(["ALL", "ALLOWED", "BLOCKED", "PENDING", "COMPROMISED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-100 cursor-pointer ${
                  statusFilter === status
                    ? "bg-forest text-emerald-400 border border-emerald-900/60 font-semibold shadow-[0_0_8px_rgba(6,17,12,0.8)]"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Clear Button */}
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-300 hover:border-crimson/50 hover:bg-crimson/10 active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer"
            title="Clear Feed History"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stream Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-neutral-950/40 border-b border-neutral-800 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase select-none">
        <div className="col-span-2 sm:col-span-2">TIME / EVENT</div>
        <div className="col-span-3 sm:col-span-2">AGENT BOT</div>
        <div className="col-span-3 sm:col-span-2">PROPOSED ACTION</div>
        <div className="hidden sm:block sm:col-span-3">COMMAND SUMMARY</div>
        <div className="col-span-2 sm:col-span-2 text-right sm:text-left">THREAT LEVEL</div>
        <div className="col-span-2 sm:col-span-1 text-right">DECISION</div>
      </div>

      {/* Scrollable Telemetry List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto divide-y divide-neutral-900/90 relative"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-neutral-500 font-mono">
            <Activity className="h-10 w-10 text-neutral-700 mb-3" />
            <p className="text-sm font-bold text-neutral-200">
              {isOnline ? "Waiting for Real PEP Tool Requests" : "PEP Offline (No Backend Connection)"}
            </p>
            <p className="text-xs text-neutral-400 mt-1.5 max-w-sm">
              {isOnline
                ? "Click any red-team scenario in the Attack Simulator above to stream live interception verdicts."
                : "Ensure FastAPI PEP is running on http://127.0.0.1:8000 (uvicorn app.main:app). Real events stream automatically."}
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isSelected = selectedEventId === event.id;
            const isBlocked = event.status === "BLOCKED";
            const isPending = event.status === "PENDING";
            let formattedTime = event.timestamp;
            try {
              formattedTime = new Date(event.timestamp).toLocaleTimeString();
            } catch {
              // fallback
            }

            return (
              <div
                key={event.id}
                onClick={() => setSelectedEventId(isSelected ? null : event.id)}
                className={`animate-feed-entry group cursor-pointer transition-colors duration-100 ${
                  isBlocked
                    ? "bg-crimson/5 hover:bg-crimson/10 border-l-2 border-l-crimson"
                    : isPending
                    ? "bg-amber-950/15 hover:bg-amber-950/25 border-l-2 border-l-amber-500"
                    : "hover:bg-neutral-900/30 border-l-2 border-l-transparent"
                } ${isSelected ? "bg-neutral-900/60" : ""}`}
              >
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-xs">
                  {/* Timestamp & ID */}
                  <div className="col-span-2 sm:col-span-2">
                    <div className="text-neutral-200 font-semibold">{formattedTime}</div>
                    <div className="text-[10px] text-neutral-500 tracking-tight">{event.id}</div>
                    {event.hop_stage && (
                      <span className="inline-block mt-0.5 px-1 py-0.2 rounded text-[9px] font-mono bg-neutral-900 border border-neutral-700/80 text-amber-300/90 font-semibold">
                        {event.hop_stage}
                      </span>
                    )}
                  </div>

                  {/* Originating Agent ID */}
                  <div className="col-span-3 sm:col-span-2 flex items-center gap-1.5 min-w-0">
                    <Bot className="h-3 w-3 text-neutral-400 flex-shrink-0" />
                    <span className="text-neutral-300 truncate font-medium">
                      {event.agent_id}
                    </span>
                  </div>

                  {/* Proposed Tool Name */}
                  <div className="col-span-3 sm:col-span-2 flex items-center gap-1.5 min-w-0">
                    <Wrench className="h-3 w-3 text-crimson flex-shrink-0" />
                    <span className="text-red-300/90 truncate font-bold">
                      {event.tool_name}
                    </span>
                  </div>

                  {/* Arguments Summary */}
                  <div className="hidden sm:block sm:col-span-3 text-neutral-400 truncate text-[11px]">
                    <span className="bg-neutral-950/80 px-2 py-0.5 rounded border border-neutral-800 text-neutral-300 inline-block max-w-full truncate">
                      {summariseArgs(event.args)}
                    </span>
                  </div>

                  {/* Risk Score */}
                  <div className="col-span-2 sm:col-span-2 flex justify-end sm:justify-start">
                    <RiskScoreBar score={event.risk_score} />
                  </div>

                  {/* Status Badge with Rule ID */}
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <StatusBadge status={event.status} ruleId={event.rule_id} />
                  </div>
                </div>

                {/* Expanded Details View on Click */}
                {isSelected && (
                  <div className="px-4 py-3 mx-4 mb-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs space-y-2 animate-feed-entry">
                    {event.rule_id && (
                      <div className="flex items-center gap-2 text-neutral-400">
                        <span className="text-[10px] font-semibold uppercase">Rule ID:</span>
                        <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-emerald-400 font-bold">
                          {event.rule_id}
                        </span>
                      </div>
                    )}

                    {event.diagnosis && (
                      <div className="flex items-start gap-2 text-red-300 bg-crimson/15 p-2 rounded-lg border border-crimson/40">
                        <AlertTriangle className="h-4 w-4 text-crimson flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-red-200 uppercase text-[10px] block">
                            Firewall Diagnosis
                          </span>
                          <p className="text-xs text-red-200 mt-0.5">{event.diagnosis}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                        Exact Tool Payload
                      </span>
                      <pre className="p-2.5 rounded-lg bg-charcoal border border-neutral-800 text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(event.args), null, 2);
                          } catch {
                            return event.args;
                          }
                        })()}
                      </pre>
                    </div>

                    {/* Review in Modal CTA */}
                    {onSelectForReview && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectForReview(event);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-forest border border-crimson/60 text-red-200 hover:bg-crimson/20 active:scale-[0.97] transition-all duration-100 ease-out shadow-[0_0_12px_rgba(163,28,24,0.3)] cursor-pointer"
                        >
                          <Lock className="h-3.5 w-3.5 text-crimson" />
                          <span>Open in Human Safety Gate</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Stream Footer Bar */}
      <div className="px-4 py-2 border-t border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between text-[11px] text-neutral-400">
        <div className="flex items-center gap-3">
          <span>
            Total Entries: <strong className="text-neutral-200">{filteredEvents.length}</strong>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="hidden sm:inline">Click any event row to inspect full parameters</span>
        </div>
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
            }}
            className="flex items-center gap-1 text-[11px] text-amber-300 bg-neutral-900 border border-amber-600/40 px-2 py-0.5 rounded-md hover:bg-neutral-800 active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer"
          >
            <ChevronDown className="h-3 w-3 animate-bounce" />
            Resume Auto-Scroll
          </button>
        )}
      </div>
    </div>
  );
}
