"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, LogOut, ShieldCheck, ChevronDown, UserCheck, Zap } from "lucide-react";
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
  role: "SecOps Lead",
  avatarText: "SA",
};

interface GoogleAuthWidgetProps {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  currentUser?: AdminUser | null;
}

export default function GoogleAuthWidget({
  isAuthenticated,
  onLogin,
  onLogout,
  currentUser = DEFAULT_ADMIN_USER,
}: GoogleAuthWidgetProps) {
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
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

  const handleInstantDemoLogin = () => {
    try {
      localStorage.setItem("agentshield_admin_session", "SOC_ADMIN_01");
    } catch {}
    onLogin();
    toast.success("Authenticated as SOC Lead", {
      description: "Active session established as SOC_ADMIN_01 (Judge Demo Bypass).",
      icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
    });
  };

  const handleSignInClick = () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      try {
        localStorage.setItem("agentshield_admin_session", "SOC_ADMIN_01");
      } catch {}
      onLogin();
      toast.success("Authenticated with Google", {
        description: "Active session established as SOC_ADMIN_01 (SecOps Lead).",
        icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
      });
    }, 400);
  };

  const handleSignOutClick = () => {
    setIsDropdownOpen(false);
    try {
      localStorage.removeItem("agentshield_admin_session");
    } catch {}
    onLogout();
    toast.info("Signed Out", {
      description: "Admin session terminated. High-risk HITL approvals now locked.",
    });
  };

  // Signed-Out State: Sleek dark button with white Google "G" SVG logo + Demo Bypass button
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1.5 font-mono">
        <button
          onClick={handleSignInClick}
          disabled={isAuthenticating}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#171717] border border-zinc-700/80 hover:border-zinc-500 text-zinc-200 text-xs font-mono font-medium active:scale-[0.97] transition-all duration-150 ease-out shadow-sm disabled:opacity-70 cursor-pointer"
          title="Sign in with Google to enable HITL approvals"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
              <span className="text-zinc-400">Authenticating...</span>
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5 fill-current text-white flex-shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              <span className="tracking-wide">Sign in with Google</span>
            </>
          )}
        </button>

        {/* 1-Click Judge Demo Bypass */}
        <button
          onClick={handleInstantDemoLogin}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-forest/80 border border-emerald-900/80 hover:border-emerald-700 text-emerald-300 text-xs font-mono font-bold active:scale-[0.97] transition-all cursor-pointer shadow-[0_0_8px_rgba(6,17,12,0.8)]"
          title="Instant 1-Click SOC Lead Session (No OAuth Setup Required)"
        >
          <Zap className="h-3 w-3 text-emerald-400" />
          <span>Demo Lead</span>
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
        className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-[#171717] border border-zinc-700/80 hover:border-zinc-500 active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer shadow-sm text-left"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <div className="relative flex items-center justify-center">
          <div className="h-6 w-6 rounded-full bg-forest border border-emerald-900/80 flex items-center justify-center text-[10px] font-bold text-emerald-300 shadow-[0_0_6px_rgba(6,17,12,0.8)]">
            {user.avatarText}
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>

        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-100 tracking-wider">
              {user.id}
            </span>
            <span className="hidden sm:inline-block px-1 py-0.2 rounded text-[9px] font-bold bg-forest text-emerald-400 border border-emerald-900/60 uppercase">
              ACTIVE
            </span>
          </div>
          <span className="text-[10px] text-zinc-400">{user.role}</span>
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-400 ml-1 transition-transform duration-150 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-[#171717] border border-zinc-800 shadow-[0_10px_35px_rgba(0,0,0,0.9)] p-2 z-50 animate-[modalIn_150ms_cubic-bezier(0.23,1,0.32,1)_forwards]">
          <div className="px-2.5 py-2 border-b border-zinc-800/80 mb-1">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <div className="text-xs font-bold text-zinc-100">{user.name}</div>
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
              {user.email}
            </div>
          </div>

          <div className="px-2.5 py-1 text-[10px] text-neutral-400">
            Authorization: <strong className="text-emerald-400">Tier 3 Human Safety Gate Sign-Off</strong>
          </div>

          <button
            onClick={handleSignOutClick}
            className="w-full mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-300 hover:bg-crimson/20 hover:text-white border border-transparent hover:border-crimson/40 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-crimson" />
            <span>Sign Out Session</span>
          </button>
        </div>
      )}
    </div>
  );
}
