"use client";

import React from "react";
import {
  Home,
  History,
  Bookmark,
  CreditCard,
  User,
  Headphones,
  Crown,
  Car,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenUpgrade: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenUpgrade,
}) => {
  const { user, role } = useAuth();
  const isRider = !!user && role === "rider";

  // Each role has its own fixed nav — no cross-role items
  const navItems = isRider
    ? [
        { id: "rider-dashboard", label: "Rider Console", icon: Car, badge: "Active" },
        { id: "history", label: "Trip History", icon: History },
        { id: "payments", label: "Earnings & Fares", icon: CreditCard },
        { id: "profile", label: "Driver Profile", icon: User },
        { id: "support", label: "Support", icon: Headphones },
      ]
    : [
        { id: "home", label: "Book a Ride", icon: Home },
        { id: "history", label: "Ride History", icon: History },
        { id: "saved", label: "Saved Places", icon: Bookmark },
        { id: "payments", label: "Payments", icon: CreditCard },
        { id: "profile", label: "Profile", icon: User },
        { id: "support", label: "Support", icon: Headphones },
      ];

  return (
    <aside className="w-[236px] min-w-[236px] bg-[#0d0f14] border-r border-[#1a1d26] flex flex-col justify-between p-4 min-h-screen select-none z-20">
      <div className="flex flex-col">
        {/* Brand Logo & Role Badge */}
        <div className="px-3 py-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-extrabold tracking-tight text-white flex items-center">
              Ride<span className="text-white">X</span>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isRider ? "bg-[#bef264]" : "bg-sky-400"
              }`}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {isRider ? "Rider / Driver Mode" : "Customer Mode"}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left w-full ${
                  isActive
                    ? "bg-[#181b23] text-white"
                    : "text-gray-400 hover:text-gray-200 hover:bg-[#13161f]"
                }`}
              >
                {/* Active left green indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#bef264] rounded-r-full" />
                )}

                <div className="flex items-center gap-3.5 min-w-0">
                  <Icon
                    size={19}
                    className={`transition-colors shrink-0 ${
                      isActive
                        ? "text-[#bef264]"
                        : "text-gray-400 group-hover:text-gray-200"
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#bef264]/10 text-[#bef264] border border-[#bef264]/20 shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* RideX Premium Promo Card */}
      <div className="mt-auto pt-4">
        <div className="bg-[#13151c] border border-[#1e222e] rounded-2xl p-4 flex flex-col relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-amber-400 text-lg">
              <Crown size={18} className="fill-amber-400 text-amber-400" />
            </div>
            <h4 className="text-white font-bold text-sm tracking-tight">
              RideX Premium
            </h4>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Get exclusive benefits, priority booking and more.
          </p>

          <button
            onClick={onOpenUpgrade}
            className="w-full bg-white hover:bg-gray-100 text-[#0d0f14] font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] text-center"
          >
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
};
