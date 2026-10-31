"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TelemetryEvent, TelemetryStatus } from "@/types/telemetry";
import { adaptBackendToTelemetry } from "@/lib/telemetry-adapter";
import { getWsUrl } from "@/lib/api-config";

const MAX_BUFFER = 250;
const RECONNECT_INTERVAL_MS = 3500;
const MOCK_INTERVAL_MS = 2500;

// Synthetic fallback dataset (ONLY used when user manually toggles mockMode on)
const MOCK_AGENTS = [
  "Worker-Agent-01",
  "Scout-Agent-09",
  "Orchestrator-Alpha",
  "Planner-Agent-03",
  "Coder-Agent-07",
  "Database-Agent-02",
];

interface MockScenario {
  tool_name: string;
  argsGenerator: () => string;
  risk_score: number;
  status: TelemetryStatus;
  diagnosis: string;
  rule_id: string;
}

const MOCK_SCENARIOS: MockScenario[] = [
  {
    tool_name: "execute_bash",
    argsGenerator: () => JSON.stringify({ command: "rm -rf /backups" }),
    risk_score: 96,
    status: "PENDING",
    diagnosis: "Indirect prompt injection detected: Tainted context instruction attempting filesystem destruction",
    rule_id: "R-TAINT-01",
  },
  {
    tool_name: "query_database",
    argsGenerator: () => JSON.stringify({ query: "SELECT * FROM soc_credentials WHERE role='admin' --" }),
    risk_score: 91,
    status: "PENDING",
    diagnosis: "Malicious SQL injection signature: attempting credential exfiltration from privileged table",
    rule_id: "R-RBAC-01",
  },
  {
    tool_name: "read_document",
    argsGenerator: () => JSON.stringify({ filename: "/etc/shadow" }),
    risk_score: 79,
    status: "PENDING",
    diagnosis: "Sensitive credential store access requested; requires SOC manual sign-off",
    rule_id: "R-SENSITIVE-01",
  },
  {
    tool_name: "read_document",
    argsGenerator: () => JSON.stringify({ filename: "invoice_90214.pdf" }),
    risk_score: 12,
    status: "ALLOWED",
    diagnosis: "Whitelisted document retrieval under inspection policy",
    rule_id: "R-ALLOW-01",
  },
  {
    tool_name: "send_email",
    argsGenerator: () => JSON.stringify({ recipient: "finance@company.test", subject: "Invoice Status" }),
    risk_score: 15,
    status: "ALLOWED",
    diagnosis: "Outbound communication authorized to enterprise domain",
    rule_id: "R-EGRESS-01",
  },
];

let eventIdCounter = 1048;

function createMockEvent(): TelemetryEvent {
  const scenario = MOCK_SCENARIOS[Math.floor(Math.random() * MOCK_SCENARIOS.length)];
  const agentId = MOCK_AGENTS[Math.floor(Math.random() * MOCK_AGENTS.length)];
  const score = scenario.risk_score;

  return {
    id: `evt_mock_${++eventIdCounter}`,
    timestamp: new Date().toISOString(),
    agent_id: agentId,
    tool_name: scenario.tool_name,
    args: scenario.argsGenerator(),
    risk_score: score,
    status: scenario.status,
    diagnosis: scenario.diagnosis,
    rule_id: scenario.rule_id,
  };
}

export interface SecurityStreamStats {
  total: number;
  allowed: number;
  blocked: number;
  pending: number;
}

export function useSecurityStream() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  // Default mock mode is OFF (acceptance requirement: fresh load = empty, no fake events)
  const [mockMode, setMockMode] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMockActiveRef = useRef<boolean>(mockMode);

  useEffect(() => {
    isMockActiveRef.current = mockMode;
  }, [mockMode]);

  const addEvent = useCallback((event: TelemetryEvent) => {
    setEvents((prev) => {
      // If event already exists (e.g. pending -> resolved), update it
      const existingIdx = prev.findIndex((e) => e.id === event.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...event };
        return updated;
      }
      return [event, ...prev].slice(0, MAX_BUFFER);
    });
  }, []);

  const addEvents = useCallback((newEvents: TelemetryEvent[]) => {
    if (!newEvents.length) return;
    setEvents((prev) => {
      let updated = [...prev];
      for (const ev of newEvents) {
        const existingIdx = updated.findIndex((e) => e.id === ev.id);
        if (existingIdx !== -1) {
          updated[existingIdx] = { ...updated[existingIdx], ...ev };
        } else {
          updated = [ev, ...updated];
        }
      }
      return updated.slice(0, MAX_BUFFER);
    });
  }, []);

  const updateEventStatus = useCallback((id: string, newStatus: TelemetryStatus, newDiagnosis?: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: newStatus,
              diagnosis: newDiagnosis ? `${e.diagnosis ? e.diagnosis + "; " : ""}${newDiagnosis}` : e.diagnosis,
            }
          : e
      )
    );
  }, []);

  const injectEvent = useCallback((event: TelemetryEvent) => {
    addEvent(event);
  }, [addEvent]);

  // WebSocket Connection Logic
  const connectWebSocket = useCallback(() => {
    if (isMockActiveRef.current) return;

    try {
      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (!parsed || typeof parsed !== "object") return;

          // 1. Ignore connected welcome message
          if (parsed.event === "connected") return;

          // 2. Handle ATTACK_INTERCEPTED: ingest steps into stream if present
          if (parsed.event === "ATTACK_INTERCEPTED" && parsed.data && Array.isArray(parsed.data.steps)) {
            const mappedSteps: TelemetryEvent[] = [];
            for (const step of parsed.data.steps) {
              const adapted = adaptBackendToTelemetry(step);
              if (adapted) mappedSteps.push(adapted);
            }
            if (mappedSteps.length) {
              addEvents(mappedSteps);
            }
            return;
          }

          // 3. Handle NEW_BLOCK: map block to telemetry row if not already present
          if (parsed.event === "NEW_BLOCK" && parsed.block) {
            const adapted = adaptBackendToTelemetry(parsed.block);
            if (adapted) addEvent(adapted);
            return;
          }

          // 4. Adapt standard PEP alerts: allowed, blocked, approval_required, approval_resolved, injection_detected
          const adapted = adaptBackendToTelemetry(parsed);
          if (adapted) {
            addEvent(adapted);
          }
        } catch (e) {
          console.warn("[AgentShield WS] Received unparseable message:", e);
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        if (!isMockActiveRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, RECONNECT_INTERVAL_MS);
        }
      };
    } catch {
      setConnected(false);
      if (!isMockActiveRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, RECONNECT_INTERVAL_MS);
      }
    }
  }, [addEvent, addEvents]);

  // Mock Stream Controller: only runs when mockMode is explicitly toggled on
  const startMockStream = useCallback(() => {
    setEvents((prev) => (prev.length === 0 ? [createMockEvent()] : prev));

    if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
    mockIntervalRef.current = setInterval(() => {
      addEvent(createMockEvent());
    }, MOCK_INTERVAL_MS);
  }, [addEvent]);

  const stopMockStream = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }, []);

  // Sync mode changes
  useEffect(() => {
    if (mockMode) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setConnected(false);
      startMockStream();
    } else {
      stopMockStream();
      connectWebSocket();
    }

    return () => {
      stopMockStream();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [mockMode, connectWebSocket, startMockStream, stopMockStream]);

  const toggleMock = useCallback(() => {
    setMockMode((prev) => !prev);
  }, []);

  const clearStream = useCallback(() => {
    setEvents([]);
  }, []);

  const stats: SecurityStreamStats = {
    total: events.length,
    allowed: events.filter((e) => e.status === "ALLOWED").length,
    blocked: events.filter((e) => e.status === "BLOCKED").length,
    pending: events.filter((e) => e.status === "PENDING").length,
  };

  return {
    events,
    connected,
    mockMode,
    toggleMock,
    clearStream,
    updateEventStatus,
    injectEvent,
    addEvents,
    stats,
  };
}
