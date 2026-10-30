"use client";

import { useState, useRef, useEffect } from "react";
import {
  Terminal,
  Trash2,
  ChevronDown,
  Bot,
  Wrench,
  AlertOctagon,
  Search,
  Filter,
  SlidersHorizontal,
  Lock,
  AlertTriangle,
  CheckCircle,
  Ban,
  ShieldAlert,
} from "lucide-react";
import type { TelemetryEvent, TelemetryStatus } from "@/types/telemetry";
import { summariseArgs } from "@/types/telemetry";
import StatusBadge from "./StatusBadge";
import RiskScoreBar from "./RiskScoreBar";

interface LiveTelemetryStreamProps {
  events: TelemetryEvent[];
  onClear: () => void;
  mockMode: boolean;
  onToggleMock: () => void;
  onSelectForReview?: (event: TelemetryEvent) => void;
}

export default function LiveTelemetryStream({
  events,
  onClear,
  mockMode,
  onToggleMock,
  onSelectForReview,
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest border border-emerald-900/60">
            <Terminal className="h-3.5 w-3.5 text-crimson" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide text-neutral-100 uppercase flex items-center gap-2">
              Live Telemetry Stream
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson" />
              </span>
            </h2>
            <p className="text-[10px] text-neutral-400">
              Real-time AI agent tool execution intercept pipeline
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
              placeholder="Search agent, tool, args..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 sm:w-56 pl-8 pr-2.5 py-1 text-xs bg-neutral-950/70 border border-neutral-800 rounded-lg text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-crimson transition-colors duration-100"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center rounded-lg bg-neutral-950/70 p-0.5 border border-neutral-800">
            {(["ALL", "BLOCKED", "ALLOWED", "PENDING"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer ${
                  statusFilter === filter
                    ? filter === "BLOCKED"
                      ? "bg-crimson text-white font-bold shadow-[0_0_8px_rgba(163,28,24,0.4)]"
                      : filter === "ALLOWED"
                      ? "bg-forest border border-emerald-800/80 text-emerald-300 font-bold"
                      : filter === "PENDING"
                      ? "bg-neutral-800 text-amber-300 font-bold"
                      : "bg-neutral-800 text-neutral-100 font-bold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Clear stream button */}
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-400 bg-neutral-950/70 border border-neutral-800 hover:border-crimson/50 hover:text-red-300 rounded-lg active:scale-[0.97] transition-all duration-100 ease-out cursor-pointer"
            title="Clear Stream Buffer"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Stream Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-neutral-950/40 border-b border-neutral-800 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase select-none">
        <div className="col-span-2 sm:col-span-2">TIMESTAMP / ID</div>
        <div className="col-span-3 sm:col-span-2">AGENT ID</div>
        <div className="col-span-3 sm:col-span-2">TOOL NAME</div>
        <div className="hidden sm:block sm:col-span-3">PROPOSED ARGUMENTS</div>
        <div className="col-span-2 sm:col-span-2 text-right sm:text-left">RISK SCORE</div>
        <div className="col-span-2 sm:col-span-1 text-right">STATUS</div>
      </div>

      {/* Scrollable Telemetry List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto divide-y divide-neutral-900/90 relative"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-neutral-500">
            <Terminal className="h-10 w-10 text-neutral-700 mb-3 animate-pulse" />
            <p className="text-sm text-neutral-300">No telemetry events in buffer</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              Use the manual test simulation bar above or toggle the synthetic stream.
            </p>
            {!mockMode && (
              <button
                onClick={onToggleMock}
                className="mt-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-crimson text-white hover:bg-red-800 active:scale-[0.97] transition-all duration-100 ease-out shadow-[0_0_12px_rgba(163,28,24,0.3)] cursor-pointer"
              >
                Start Background Stream
              </button>
            )}
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isSelected = selectedEventId === event.id;
            const isBlocked = event.status === "BLOCKED";
            const isPending = event.status === "PENDING";
            const formattedTime = new Date(event.timestamp)
              .toISOString()
              .substring(11, 19);

            return (
              <div
                key={event.id}
                onClick={() => setSelectedEventId(isSelected ? null : event.id)}
                className={`animate-feed-entry group cursor-pointer transition-colors duration-100 ${
                  isBlocked
                    ? "bg-crimson/5 hover:bg-crimson/10 border-l-2 border-l-crimson"
                    : isPending
                    ? "bg-amber-950/10 hover:bg-amber-950/20 border-l-2 border-l-amber-500/80"
                    : "hover:bg-neutral-900/30 border-l-2 border-l-transparent"
                } ${isSelected ? "bg-neutral-900/60" : ""}`}
              >
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-xs">
                  {/* Timestamp & ID */}
                  <div className="col-span-2 sm:col-span-2">
                    <div className="text-neutral-200 font-semibold">{formattedTime}</div>
                    <div className="text-[10px] text-neutral-500 tracking-tight">{event.id}</div>
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

                  {/* Status Badge */}
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <StatusBadge status={event.status} />
                  </div>
                </div>

                {/* Expanded Details View on Click */}
                {isSelected && (
                  <div className="px-4 py-3 mx-4 mb-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs space-y-2 animate-feed-entry">
                    {event.diagnosis && (
                      <div className="flex items-start gap-2 text-red-300 bg-crimson/15 p-2 rounded-lg border border-crimson/40">
                        <AlertTriangle className="h-4 w-4 text-crimson flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-red-200 uppercase text-[10px] block">
                            Security Policy Diagnosis
                          </span>
                          <p className="text-xs text-red-200 mt-0.5">{event.diagnosis}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                        Full Tool Arguments Payload
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-forest border border-emerald-600/70 text-emerald-300 hover:bg-forest/80 active:scale-[0.97] transition-transform duration-100 ease-out shadow-[0_0_10px_rgba(6,17,12,0.8)] cursor-pointer"
                        >
                          <Lock className="h-3.5 w-3.5 text-crimson" />
                          <span>Open in HITL Approval Gate</span>
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
            Total Filtered: <strong className="text-neutral-200">{filteredEvents.length}</strong>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="hidden sm:inline">Click any event row to inspect full JSON payload</span>
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
