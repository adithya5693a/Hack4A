"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, ShieldCheck, ChevronDown, UserCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarText: string;
}

export const DEFAULT_ADMIN_USER: AdminUser = {
  id: "SOC_ADMIN_01",
  name: "SOC_ADMIN_01",
  email: "admin.secops@agentshield.corp",
  role: "SecOps Lead (Admin)",
  avatarText: "SA",
};

interface SOCAuthWidgetProps {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  currentUser?: AdminUser | null;
}

export default function SOCAuthWidget({
  isAuthenticated,
  onLogin,
  onLogout,
  currentUser = DEFAULT_ADMIN_USER,
}: SOCAuthWidgetProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-restore admin session from localStorage if previously authorized
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem("agentshield_admin_session");
      if (savedAuth === "SOC_ADMIN_01" && !isAuthenticated) {
        onLogin();
      }
    } catch {
      // ignore in SSR
    }
  }, [isAuthenticated, onLogin]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isDropdownOpen]);

  const handleDemoSessionClick = () => {
    try {
      localStorage.setItem("agentshield_admin_session", "SOC_ADMIN_01");
    } catch {}
    onLogin();
    toast.success("SOC Session Established", {
      description: "Authenticated as SOC_ADMIN_01 (Bearer token active).",
      icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
    });
  };

  const handleSignOutClick = () => {
    setIsDropdownOpen(false);
    try {
      localStorage.removeItem("agentshield_admin_session");
    } catch {}
    onLogout();
    toast.info("SOC Session Ended", {
      description: "Admin session terminated. HITL approvals locked.",
    });
  };

  // Signed-Out State: Single honest "Demo SOC Session" button
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1.5 font-mono">
        <button
          onClick={handleDemoSessionClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-emerald-600 text-neutral-200 text-xs font-mono font-medium active:scale-[0.97] transition-all duration-150 ease-out shadow-sm cursor-pointer"
          title="Authenticate as SOC Administrator to authorize HITL actions"
        >
          <KeyRound className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span className="tracking-wide">Demo SOC Session</span>
        </button>
      </div>
    );
  }

  // Signed-In State: User avatar + user tag + role + dropdown menu
  const user = currentUser || DEFAULT_ADMIN_USER;

  return (
    <div className="relative font-mono" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-forest/80 border border-emerald-900/80 hover:border-emerald-600 text-xs text-neutral-200 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,17,12,0.8)]"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-bold text-emerald-300">
          {user.avatarText}
        </div>
        <div className="flex flex-col text-left">
          <span className="font-bold text-neutral-100 text-[11px] leading-tight">
            {user.id}
          </span>
          <span className="text-[9px] text-emerald-400 leading-none">
            {user.role}
          </span>
        </div>
        <ChevronDown className="h-3 w-3 text-neutral-400 ml-0.5" />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-charcoal border border-neutral-800 p-2 shadow-2xl z-50 text-xs animate-feed-entry">
          <div className="px-2.5 py-2 border-b border-neutral-800/80 mb-1">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
              <UserCheck className="h-3 w-3" />
              <span>SOC Admin Session Active</span>
            </div>
            <div className="text-[11px] font-bold text-neutral-200">{user.email}</div>
            <div className="text-[10px] text-neutral-400">Bearer Token Verified</div>
          </div>

          <button
            onClick={handleSignOutClick}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-300 hover:bg-crimson/20 hover:text-white transition-colors cursor-pointer text-left"
          >
            <LogOut className="h-3.5 w-3.5 text-crimson" />
            <span>End SOC Session</span>
          </button>
        </div>
      )}
    </div>
  );
}
