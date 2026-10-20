"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  MapPin,
  Check,
  X,
  User as UserIcon,
  LogOut,
  Settings,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

interface TopbarProps {
  onSelectSearchResult?: (location: string, type: "pickup" | "dropoff") => void;
  onOpenHelp?: () => void;
  onOpenAuth?: () => void;
}

export const NAGPUR_SUGGESTIONS = [
  { name: "Dharampeth, Nagpur", desc: "West Nagpur • Shopping & Food Hub", lat: 21.1458, lng: 79.0882 },
  { name: "Suryodaya College, Nagpur", desc: "Near Dighori & New Kamptee Rd", lat: 21.1611, lng: 79.1412 },
  { name: "Sitabuldi Metro Station", desc: "Interchange Hub • Central Nagpur", lat: 21.148, lng: 79.084 },
  { name: "Dr. Babasaheb Ambedkar Airport", desc: "Sonegaon, Nagpur • Terminal 1", lat: 21.0922, lng: 79.0478 },
  { name: "Futala Lake Promenade", desc: "Lake View • Chowpatty & Cafes", lat: 21.154, lng: 79.051 },
  { name: "MIHAN SEZ, Nagpur", desc: "South Nagpur • Tech Park Hub", lat: 21.045, lng: 79.048 },
  { name: "Orange City Hospital", desc: "Khamla Square • Healthcare Center", lat: 21.121, lng: 79.068 },
  { name: "Ambazari Lake & Garden", desc: "Ambazari Rd • Scenic Point", lat: 21.134, lng: 79.055 },
];

export const Topbar: React.FC<TopbarProps> = ({
  onSelectSearchResult,
  onOpenHelp,
  onOpenAuth,
}) => {
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(true);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLocations = NAGPUR_SUGGESTIONS.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="h-[68px] min-h-[68px] bg-[#0d0f14] border-b border-[#1a1d26] flex items-center justify-between px-6 z-[60] relative overflow-visible">
      {/* Search Input Box */}
      <div className="relative w-full max-w-[420px]" ref={searchRef}>
        <div className="flex items-center gap-3 bg-[#13151c] border border-[#1e222e] hover:border-gray-700 focus-within:border-gray-500 rounded-xl px-3.5 py-2 transition-all">
          <Search size={17} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search location, places..."
            className="bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-gray-500 hover:text-gray-300"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#141722] border border-[#232838] rounded-xl shadow-2xl py-2 z-[70] overflow-hidden backdrop-blur-xl">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Nagpur Locations
            </div>
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc, idx) => (
                <div
                  key={idx}
                  className="px-3.5 py-2.5 hover:bg-[#1c2130] cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div
                    className="flex items-center gap-3 flex-1"
                    onClick={() => {
                      if (onSelectSearchResult) {
                        onSelectSearchResult(loc.name, "dropoff");
                      }
                      setSearchQuery(loc.name);
                      setShowSearchResults(false);
                    }}
                  >
                    <div className="p-1.5 rounded-lg bg-[#202534] text-gray-400 group-hover:text-[#bef264]">
                      <MapPin size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-200 group-hover:text-white">
                        {loc.name}
                      </p>
                      <p className="text-[11px] text-gray-500">{loc.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        onSelectSearchResult?.(loc.name, "pickup");
                        setShowSearchResults(false);
                      }}
                      className="text-[10px] bg-[#22283a] hover:bg-[#2c3349] text-emerald-400 px-2 py-0.5 rounded font-medium"
                    >
                      Pickup
                    </button>
                    <button
                      onClick={() => {
                        onSelectSearchResult?.(loc.name, "dropoff");
                        setShowSearchResults(false);
                      }}
                      className="text-[10px] bg-[#22283a] hover:bg-[#2c3349] text-sky-400 px-2 py-0.5 rounded font-medium"
                    >
                      Drop-off
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-gray-500">
                No places found for &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Navigation & Profile Controls */}
      <div className="flex items-center gap-6">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setHasUnreadNotice(false);
            }}
            className="relative p-2 text-gray-400 hover:text-gray-200 hover:bg-[#151821] rounded-xl transition-all"
            aria-label="Notifications"
          >
            <Bell size={19} />
            {hasUnreadNotice && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#bef264] rounded-full ring-2 ring-[#0d0f14]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-[#141722] border border-[#232838] rounded-2xl shadow-2xl p-3 z-[70]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800">
                <span className="text-xs font-bold text-white">Notifications</span>
                <span className="text-[10px] text-[#bef264] font-medium">New</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-xl bg-[#1b1f2b] text-gray-300">
                  <p className="font-semibold text-white">Flat ₹50 OFF RideX Comfort</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">Use promo code NAGPUR50 on your next ride.</p>
                </div>
                <div className="p-2 rounded-xl bg-[#1b1f2b] text-gray-300">
                  <p className="font-semibold text-white">Nagpur Metro Hub Drop-offs</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">Direct drop-off at Sitabuldi interchange active.</p>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Help Link */}
        <button
          onClick={onOpenHelp}
          className="text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>Help</span>
        </button>

        {/* User Profile Pill */}
        <div className="relative" ref={profileRef}>
          {user ? (
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 p-1 pl-1.5 pr-2 rounded-xl hover:bg-[#141722] transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-700 relative bg-[#1e2330]">
                <Image
                  src="/images/avatar_krish.png"
                  alt={user.user_metadata?.full_name || user.email || "User"}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
              <span className="text-sm font-medium text-gray-200 group-hover:text-white">
                {user.user_metadata?.full_name || user.email?.split("@")[0] || "Krish Bangade"}
              </span>
              <ChevronDown
                size={15}
                className={`text-gray-400 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
              />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-[#bef264] hover:bg-[#b0e84f] text-black font-extrabold text-xs py-2 px-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <UserIcon size={14} />
              <span>Sign In</span>
            </button>
          )}

          {showProfileMenu && user && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#141722] border border-[#232838] rounded-2xl shadow-2xl p-2 z-[70]">
              <div className="px-3 py-2 border-b border-gray-800/80 mb-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">
                    {user.user_metadata?.full_name || "RideX User"}
                  </p>
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-[#bef264]/10 text-[#bef264]">
                    {role}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                {user.user_metadata?.phone && (
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{user.user_metadata.phone}</p>
                )}
              </div>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-[#1c2130] rounded-xl transition-colors">
                <UserIcon size={14} /> My Profile
              </button>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-[#1c2130] rounded-xl transition-colors">
                <Settings size={14} /> Account Settings
              </button>
              <div className="h-px bg-gray-800/80 my-1" />
              <button
                onClick={async () => {
                  await signOut();
                  setShowProfileMenu(false);
                  router.replace("/auth");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
