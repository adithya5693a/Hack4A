"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TelemetryEvent, TelemetryStatus } from "@/types/telemetry";

const WS_URL = "ws://localhost:8000/ws/security-stream";
const MAX_BUFFER = 250;
const RECONNECT_INTERVAL_MS = 3500;
const MOCK_INTERVAL_MS = 2000;

// Realistic synthetic dataset pool for mock generation
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
}

// Scenarios strictly aligned with our 3-Tier Permission Architecture:
// Tier 1: 0% - 39% Risk (ALLOWED - Safe / Automated)
// Tier 2: 40% - 69% Risk (INSPECTED - Sensitive Read)
// Tier 3: 70% - 100% Risk (PENDING - Human-in-the-Loop Review)
const MOCK_SCENARIOS: MockScenario[] = [
  {
    tool_name: "execute_bash",
    argsGenerator: () => JSON.stringify({ command: "rm -rf /backups" }),
    risk_score: 96,
    status: "PENDING",
    diagnosis: "Indirect prompt injection detected: Tainted context instruction attempting filesystem destruction",
  },
  {
    tool_name: "sql_query",
    argsGenerator: () => JSON.stringify({ query: "SELECT * FROM soc_credentials WHERE role='admin' --" }),
    risk_score: 91,
    status: "PENDING",
    diagnosis: "Malicious SQL injection signature: attempting credential exfiltration from privileged table",
  },
  {
    tool_name: "execute_bash",
    argsGenerator: () => JSON.stringify({ command: "iptables -F && systemctl stop ufw" }),
    risk_score: 84,
    status: "PENDING",
    diagnosis: "Perimeter firewall rule tampering detected; security modification pending human approval",
  },
  {
    tool_name: "read_file",
    argsGenerator: () => JSON.stringify({ path: "/etc/shadow" }),
    risk_score: 79,
    status: "PENDING",
    diagnosis: "Sensitive credential store access requested; requires SOC manual sign-off",
  },
  {
    tool_name: "read_file",
    argsGenerator: () => JSON.stringify({ path: "/etc/nginx/nginx.conf" }),
    risk_score: 48,
    status: "ALLOWED",
    diagnosis: "Inspected: Configuration read within verified server inspection boundary",
  },
  {
    tool_name: "http_request",
    argsGenerator: () => JSON.stringify({ url: "http://internal-telemetry:9090/metrics", method: "GET" }),
    risk_score: 45,
    status: "ALLOWED",
    diagnosis: "Inspected: Internal metrics scrape authorized under automated inspection rule",
  },
  {
    tool_name: "read_file",
    argsGenerator: () => JSON.stringify({ path: "/var/log/audit.log" }),
    risk_score: 12,
    status: "ALLOWED",
    diagnosis: "Whitelisted security audit log ingestion by authorized analysis agent",
  },
  {
    tool_name: "web_search",
    argsGenerator: () => JSON.stringify({ query: "CVE-2026-4418 mitigation strategies", depth: 2 }),
    risk_score: 8,
    status: "ALLOWED",
    diagnosis: "Read-only threat research query executed within perimeter bounds",
  },
  {
    tool_name: "http_request",
    argsGenerator: () => JSON.stringify({ url: "https://api.github.com/repos/agentshield/core/commits", method: "GET" }),
    risk_score: 5,
    status: "ALLOWED",
    diagnosis: "Verified outbound HTTPS API call to whitelisted developer domain",
  },
  {
    tool_name: "list_directory",
    argsGenerator: () => JSON.stringify({ directory: "/home/sandbox/workspace" }),
    risk_score: 15,
    status: "ALLOWED",
    diagnosis: "Standard workspace navigation inside container boundaries",
  },
];

let eventIdCounter = 1048;

function createMockEvent(): TelemetryEvent {
  const scenario = MOCK_SCENARIOS[Math.floor(Math.random() * MOCK_SCENARIOS.length)];
  const agentId = MOCK_AGENTS[Math.floor(Math.random() * MOCK_AGENTS.length)];

  // For the pitch demo, if it's the 96% bash command, keep it exactly 96
  const score = scenario.risk_score === 96 ? 96 : Math.max(0, Math.min(100, scenario.risk_score + (Math.floor(Math.random() * 5) - 2)));

  return {
    id: `evt_${++eventIdCounter}`,
    timestamp: new Date().toISOString(),
    agent_id: agentId,
    tool_name: scenario.tool_name,
    args: scenario.argsGenerator(),
    risk_score: score,
    status: scenario.status,
    diagnosis: scenario.diagnosis,
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
  // Do NOT run mock automatically on website load; starts idle (false)
  const [mockMode, setMockMode] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMockActiveRef = useRef<boolean>(mockMode);

  useEffect(() => {
    isMockActiveRef.current = mockMode;
  }, [mockMode]);

  const addEvent = useCallback((event: TelemetryEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, MAX_BUFFER));
  }, []);

  const updateEventStatus = useCallback((id: string, newStatus: TelemetryStatus) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
    );
  }, []);

  const injectEvent = useCallback((event: TelemetryEvent) => {
    addEvent(event);
  }, [addEvent]);

  // Manual Test Simulation Actions (Immediate dispatch without timers)
  const simulateSafeEvent = useCallback((): TelemetryEvent => {
    const safeEvent: TelemetryEvent = {
      id: `evt_${++eventIdCounter}`,
      timestamp: new Date().toISOString(),
      agent_id: "Worker-Agent-01",
      tool_name: "web_search",
      args: JSON.stringify({ query: "CVE-2026-4418 mitigation strategies", depth: 2 }),
      risk_score: 8,
      status: "ALLOWED",
      diagnosis: "Whitelisted threat intelligence query executed within perimeter bounds",
    };
    addEvent(safeEvent);
    return safeEvent;
  }, [addEvent]);

  const simulateTier3Attack = useCallback((): TelemetryEvent => {
    const attackEvent: TelemetryEvent = {
      id: `evt_${++eventIdCounter}`,
      timestamp: new Date().toISOString(),
      agent_id: "Worker-Agent-01",
      tool_name: "execute_bash",
      args: JSON.stringify({ command: "rm -rf /backups" }),
      risk_score: 96,
      status: "PENDING",
      diagnosis: "Indirect prompt injection detected: Tainted context instruction attempting filesystem destruction",
    };
    addEvent(attackEvent);
    return attackEvent;
  }, [addEvent]);

  // WebSocket Connection Logic
  const connectWebSocket = useCallback(() => {
    if (isMockActiveRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.id && parsed.agent_id) {
            addEvent(parsed as TelemetryEvent);
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
  }, [addEvent]);

  // Mock Stream Controller: only runs when mockMode is toggled on
  const startMockStream = useCallback(() => {
    // Generate initial pitch-demo event when user explicitly starts mock
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
    simulateSafeEvent,
    simulateTier3Attack,
    stats,
  };
}
