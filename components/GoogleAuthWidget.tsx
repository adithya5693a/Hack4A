"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, LogOut, ShieldCheck, ChevronDown, UserCheck } from "lucide-react";
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

  const handleSignInClick = () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);

    // Brief 500ms realistic loading spinner
    setTimeout(() => {
      setIsAuthenticating(false);
      onLogin();
      toast.success("Authenticated with Google", {
        description: "Active session established as SOC_ADMIN_01 (SecOps Lead).",
        icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
      });
    }, 500);
  };

  const handleSignOutClick = () => {
    setIsDropdownOpen(false);
    onLogout();
    toast.info("Signed Out", {
      description: "Admin session terminated. High-risk HITL approvals now locked.",
    });
  };

  // Signed-Out State: Sleek dark button with white Google "G" SVG logo
  if (!isAuthenticated) {
    return (
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
            {/* White Google "G" Logo SVG */}
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
        {/* Circular Avatar with Active Status Dot */}
        <div className="relative flex-shrink-0">
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-zinc-600 flex items-center justify-center text-[11px] font-bold text-zinc-100 shadow-inner">
            {user.avatarText}
          </div>
          {/* Green Active Status Dot */}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-[#171717]" />
          </span>
        </div>

        {/* User Tag & Role */}
        <div className="hidden sm:flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-100 tracking-wider">
              {user.name}
            </span>
          </div>
          <span className="text-[10px] font-medium text-emerald-400">
            Role: {user.role}
          </span>
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-150 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#171717] border border-zinc-700/80 shadow-[0_10px_35px_rgba(0,0,0,0.85)] p-2 z-50 animate-[modalIn_150ms_cubic-bezier(0.23,1,0.32,1)_forwards]">
          {/* User Profile Header */}
          <div className="px-2.5 py-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-100 truncate">
                {user.name}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate mt-0.5">
              {user.email}
            </p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                Privilege
              </span>
              <span className="text-[10px] font-semibold text-emerald-400">
                Tier 3 Approver
              </span>
            </div>
          </div>

          {/* Action: Sign Out */}
          <div className="pt-1.5">
            <button
              onClick={handleSignOutClick}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-300 hover:text-white hover:bg-crimson/20 active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer text-left"
            >
              <LogOut className="h-3.5 w-3.5 text-crimson" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
