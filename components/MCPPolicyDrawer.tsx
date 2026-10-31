"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  X,
  Layers,
  Cpu,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { BACKEND_URL } from "@/lib/api-config";

interface MCPPolicyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RolePolicyMatrix {
  role_permissions: Record<string, string[]>;
  tool_tiers: Record<string, number>;
  admin_only_tools: string[];
}

const DEFAULT_MATRIX: RolePolicyMatrix = {
  role_permissions: {
    worker: ["read_document", "read_file", "web_search", "query_database", "query_db"],
    finance: ["read_document", "read_file", "web_search", "query_database", "query_db", "send_email"],
    operator: ["read_document", "read_file", "web_search", "query_database", "query_db", "execute_bash", "send_email"],
    supervisor: ["read_document", "read_file", "web_search", "query_database", "query_db", "execute_bash", "send_email", "delete_database"],
    admin: ["read_document", "read_file", "web_search", "query_database", "query_db", "execute_bash", "send_email", "rotate_encryption_keys", "delete_database"],
  },
  tool_tiers: {
    read_document: 1,
    query_database: 2,
    send_email: 2,
    execute_bash: 3,
    rotate_encryption_keys: 3,
  },
  admin_only_tools: ["rotate_encryption_keys", "delete_database", "modify_policy"],
};

const DISPLAY_TOOLS = [
  { id: "read_document", name: "read_document", tier: "Tier 1 (Safe Read)" },
  { id: "query_database", name: "query_database", tier: "Tier 2 (Sensitive Read)" },
  { id: "send_email", name: "send_email", tier: "Tier 2 (Egress Allowlist)" },
  { id: "execute_bash", name: "execute_bash", tier: "Tier 3 (Host Command)" },
  { id: "rotate_encryption_keys", name: "rotate_encryption_keys", tier: "Tier 3 (Admin Only)" },
];

const ROLES = [
  { id: "worker", label: "Worker Agent", desc: "Ticket & research tasks (Unprivileged)" },
  { id: "finance", label: "Finance Agent", desc: "Accounts & invoice verification" },
  { id: "operator", label: "Sysadmin Operator", desc: "Infrastructure & backups maintenance" },
  { id: "supervisor", label: "Supervisor Agent", desc: "Agent team controller" },
  { id: "admin", label: "Security Admin", desc: "Root policy & cryptographic keyholder" },
];

export default function MCPPolicyDrawer({ isOpen, onClose }: MCPPolicyDrawerProps) {
  const [policyData, setPolicyData] = useState<RolePolicyMatrix>(DEFAULT_MATRIX);
  const [selectedRole, setSelectedRole] = useState<string>("worker");

  useEffect(() => {
    if (!isOpen) return;
    const fetchPolicy = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/pep/policy`);
        if (res.ok) {
          const data = await res.json();
          if (data.role_permissions && data.tool_tiers) {
            setPolicyData({
              role_permissions: data.role_permissions,
              tool_tiers: data.tool_tiers,
              admin_only_tools: data.admin_only_tools || [],
            });
          }
        }
      } catch (err) {
        console.warn("[MCP Drawer] Could not load live policy:", err);
      }
    };
    fetchPolicy();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-4xl bg-charcoal rounded-2xl border border-forest shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(6,17,12,0.8)] overflow-hidden font-mono z-10 animate-[modalIn_180ms_cubic-bezier(0.23,1,0.32,1)_forwards]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest border border-emerald-900/60 text-emerald-400">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-100">
                  MCP Tool Permission Profiles
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-forest text-emerald-400 border border-emerald-900/60 uppercase">
                  RBAC Matrix
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Model Context Protocol (MCP) gateway policies governing tool authorization per agent role.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Policy Explanation Banner */}
          <div className="p-3 rounded-xl bg-forest/40 border border-emerald-900/60 text-emerald-200 text-xs flex items-start gap-2.5">
            <Info className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Zero-Trust Least Privilege:</strong> Tools are categorized into 3 Risk Tiers. Worker roles cannot invoke admin tools (<strong>R-RBAC-01</strong>), while high-impact operations trigger human approval (<strong>R-APPROVAL-01</strong>).
            </div>
          </div>

          {/* Matrix Table */}
          <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/80 text-[10px] uppercase text-neutral-400 tracking-wider">
                    <th className="p-3">Agent Role</th>
                    {DISPLAY_TOOLS.map((tool) => (
                      <th key={tool.id} className="p-3 text-center">
                        <div className="font-bold text-neutral-200">{tool.name}</div>
                        <div className="text-[9px] text-neutral-500 font-normal">{tool.tier}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {ROLES.map((role) => {
                    const permitted = policyData.role_permissions[role.id] || [];

                    return (
                      <tr key={role.id} className="hover:bg-neutral-900/40 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-neutral-200">{role.label}</div>
                          <div className="text-[10px] text-neutral-500">{role.desc}</div>
                        </td>

                        {DISPLAY_TOOLS.map((tool) => {
                          const isPermitted = permitted.includes(tool.id);
                          const isAdminOnly = policyData.admin_only_tools.includes(tool.id);
                          const isTier3 = policyData.tool_tiers[tool.id] === 3;

                          if (!isPermitted) {
                            return (
                              <td key={tool.id} className="p-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-crimson/20 border border-crimson/50 text-red-300">
                                  <ShieldAlert className="h-3 w-3 text-crimson" />
                                  FORBIDDEN
                                </span>
                              </td>
                            );
                          }

                          if (isTier3 && !isAdminOnly) {
                            return (
                              <td key={tool.id} className="p-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/40 border border-amber-600/50 text-amber-300">
                                  <Clock className="h-3 w-3 text-amber-400" />
                                  HITL GATE
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={tool.id} className="p-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-forest border border-emerald-900/60 text-emerald-400">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                ALLOWED
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <span>Active Policy: <strong className="text-neutral-200">PEP_STRICT_RBAC_V2</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-200 font-bold active:scale-[0.97] transition-all cursor-pointer"
          >
            Close Policy Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
