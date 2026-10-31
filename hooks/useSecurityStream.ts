"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TelemetryEvent, TelemetryStatus } from "@/types/telemetry";
import { adaptBackendToTelemetry } from "@/lib/telemetry-adapter";
import { getWsUrl } from "@/lib/api-config";

const MAX_BUFFER = 250;
const RECONNECT_INTERVAL_MS = 3500;

export interface SecurityStreamStats {
  total: number;
  allowed: number;
  blocked: number;
  pending: number;
  compromised: number;
}

export function useSecurityStream() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [connected, setConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addEvent = useCallback((event: TelemetryEvent) => {
    setEvents((prev) => {
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

  // WebSocket Connection Logic (Only connects to real FastAPI PEP)
  const connectWebSocket = useCallback(() => {
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
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, RECONNECT_INTERVAL_MS);
      };
    } catch {
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, RECONNECT_INTERVAL_MS);
    }
  }, [addEvent, addEvents]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const clearStream = useCallback(() => {
    setEvents([]);
  }, []);

  const stats: SecurityStreamStats = {
    total: events.length,
    allowed: events.filter((e) => e.status === "ALLOWED").length,
    blocked: events.filter((e) => e.status === "BLOCKED").length,
    pending: events.filter((e) => e.status === "PENDING").length,
    compromised: events.filter((e) => e.status === "COMPROMISED").length,
  };

  return {
    events,
    connected,
    clearStream,
    updateEventStatus,
    injectEvent,
    addEvents,
    stats,
  };
}
