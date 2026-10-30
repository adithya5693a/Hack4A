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
    <div className="flex flex-col h-full bg-gradient-to-b from-[#1e2329]/70 to-[#17191c] rounded-2xl border border-[#929da7]/30 shadow-[0_8px_30px_rgba(0,0,0,0.85)] overflow-hidden font-mono">
      {/* Stream Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#929da7]/20 bg-[#17191c]/90">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17191c] border border-crimson/60 shadow-[0_0_12px_rgba(255,75,50,0.35)]">
            <Activity className="h-4 w-4 text-crimson animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-wide text-neutral-100 uppercase flex items-center gap-2.5">
              Live Agent Activity Feed
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-crimson" />
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-[#929da7]">
              Real-time monitoring of all agent tool requests and guardrail decisions.
            </p>
          </div>
        </div>

        {/* Action and Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#929da7]" />
            <input
              type="text"
              placeholder="Search agent, tool, command..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 sm:w-60 pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-[#17191c] border border-[#929da7]/30 rounded-lg text-neutral-200 placeholder:text-[#929da7]/60 focus:outline-none focus:border-crimson focus:ring-1 focus:ring-crimson/40 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center rounded-lg bg-[#17191c] p-0.5 border border-[#929da7]/30">
            {(
              [
                { id: "ALL", label: "ALL" },
                { id: "BLOCKED", label: "BLOCKED" },
                { id: "ALLOWED", label: "ALLOWED" },
                { id: "PENDING", label: "NEEDS APPROVAL" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-md active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer ${
                  statusFilter === filter.id
                    ? filter.id === "BLOCKED"
                      ? "bg-crimson text-white font-bold shadow-[0_0_10px_rgba(255,75,50,0.45)]"
                      : filter.id === "ALLOWED"
                      ? "bg-[#06110c] border border-emerald-900/80 text-emerald-300 font-bold"
                      : filter.id === "PENDING"
                      ? "bg-zinc-800 text-amber-300 font-bold"
                      : "bg-zinc-800 text-neutral-100 font-bold"
                    : "text-[#929da7] hover:text-neutral-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Clear stream button */}
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#929da7] bg-[#17191c] border border-[#929da7]/30 hover:border-crimson/50 hover:text-red-300 rounded-lg active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer"
            title="Clear Feed Buffer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Stream Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-[#17191c]/70 border-b border-[#929da7]/20 text-xs font-bold tracking-wider text-[#929da7] uppercase select-none">
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
        className="flex-1 overflow-y-auto divide-y divide-[#929da7]/15 relative"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-zinc-400">
            <Activity className="h-10 w-10 text-zinc-600 mb-3 animate-pulse" />
            <p className="text-base text-zinc-200 font-semibold">No events currently recorded</p>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-sm">
              Click any scenario in the Live Attack Simulator above or inject test events.
            </p>
            {!mockMode && (
              <button
                onClick={onToggleMock}
                className="mt-4 px-4 py-2 text-xs sm:text-sm font-bold uppercase rounded-lg bg-crimson text-white hover:bg-red-800 active:scale-[0.97] transition-all duration-150 ease-out shadow-[0_0_15px_rgba(163,28,24,0.35)] cursor-pointer"
              >
                Start Simulation Stream
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
                className={`animate-feed-entry group cursor-pointer transition-colors duration-150 ${
                  isBlocked
                    ? "bg-crimson/5 hover:bg-crimson/10 border-l-4 border-l-crimson"
                    : isPending
                    ? "bg-amber-950/15 hover:bg-amber-950/25 border-l-4 border-l-amber-500"
                    : "hover:bg-zinc-900/40 border-l-4 border-l-transparent"
                } ${isSelected ? "bg-zinc-900/70" : ""}`}
              >
                <div className="grid grid-cols-12 gap-2 px-5 py-3 items-center text-sm">
                  {/* Timestamp & ID */}
                  <div className="col-span-2 sm:col-span-2">
                    <div className="text-zinc-100 font-bold text-sm">{formattedTime}</div>
                    <div className="text-xs text-zinc-400 tracking-tight">{event.id}</div>
                  </div>

                  {/* Originating Agent ID */}
                  <div className="col-span-3 sm:col-span-2 flex items-center gap-2 min-w-0">
                    <Bot className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                    <span className="text-zinc-200 truncate font-semibold text-sm">
                      {event.agent_id}
                    </span>
                  </div>

                  {/* Proposed Tool Name (Readable from 3 feet away) */}
                  <div className="col-span-3 sm:col-span-2 flex items-center gap-2 min-w-0">
                    <Wrench className="h-4 w-4 text-crimson flex-shrink-0" />
                    <span className="text-red-300 truncate font-mono font-bold text-sm">
                      {event.tool_name}
                    </span>
                  </div>

                  {/* Arguments Summary (Readable text-sm) */}
                  <div className="hidden sm:block sm:col-span-3 text-zinc-300 truncate text-sm">
                    <span className="bg-neutral-950/90 px-2.5 py-1 rounded border border-zinc-800 text-zinc-200 inline-block max-w-full truncate text-sm font-mono">
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
                  <div className="px-5 py-4 mx-5 mb-3 rounded-xl bg-neutral-950 border border-zinc-800 text-xs sm:text-sm space-y-3 animate-feed-entry shadow-inner">
                    {event.diagnosis && (
                      <div className="flex items-start gap-2.5 text-red-200 bg-crimson/15 p-3 rounded-lg border border-crimson/40">
                        <AlertTriangle className="h-4 w-4 text-crimson flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-red-100 uppercase text-xs block">
                            Firewall Diagnosis
                          </span>
                          <p className="text-xs sm:text-sm text-red-200 mt-0.5">{event.diagnosis}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                        Exact Tool Payload
                      </span>
                      <pre className="p-3 rounded-lg bg-charcoal border border-zinc-800 text-xs sm:text-sm text-emerald-400 overflow-x-auto whitespace-pre-wrap font-mono">
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
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider bg-forest border border-crimson/60 text-red-200 hover:bg-crimson/20 active:scale-[0.97] transition-all duration-150 ease-out shadow-[0_0_12px_rgba(163,28,24,0.3)] cursor-pointer"
                        >
                          <Lock className="h-4 w-4 text-crimson" />
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
      <div className="px-5 py-2.5 border-t border-zinc-800/80 bg-neutral-950/80 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span>
            Total Recorded Entries: <strong className="text-zinc-200">{filteredEvents.length}</strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="hidden sm:inline">Click any event row to inspect full tool parameters</span>
        </div>
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
            }}
            className="flex items-center gap-1.5 text-xs text-amber-300 bg-neutral-900 border border-amber-600/40 px-2.5 py-1 rounded-md hover:bg-neutral-800 active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer"
          >
            <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
            Resume Auto-Scroll
          </button>
        )}
      </div>
    </div>
  );
}
