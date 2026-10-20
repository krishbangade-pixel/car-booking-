"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  History,
  Bookmark,
  CreditCard,
  User,
  Headphones,
  MapPin,
  Calendar,
  CheckCircle,
  HelpCircle,
  Clock,
  Car,
  Plus,
  Trash2,
  LogIn,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface NavigationDrawersProps {
  activeTab: string;
  onClose: () => void;
  onSelectSavedPlace?: (place: string) => void;
}

export const NavigationDrawers: React.FC<NavigationDrawersProps> = ({
  activeTab,
  onClose,
  onSelectSavedPlace,
}) => {
  // Live user profile state
  const [userProfile, setUserProfile] = useState<{
    email?: string;
    fullName?: string;
    avatarUrl?: string;
    id?: string;
  } | null>(null);

  // Live ride history state
  const [rides, setRides] = useState<any[]>([]);
  const [loadingRides, setLoadingRides] = useState(false);

  // Live saved places state
  const [savedPlaces, setSavedPlaces] = useState<
    Array<{ id: string; label: string; address: string }>
  >([]);
  const [newPlaceLabel, setNewPlaceLabel] = useState("");
  const [newPlaceAddress, setNewPlaceAddress] = useState("");
  const [isAddingPlace, setIsAddingPlace] = useState(false);

  // Fetch Supabase Auth user & live rides/saved places
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserProfile({
          email: data.user.email,
          fullName: data.user.user_metadata?.full_name || data.user.email?.split("@")[0],
          avatarUrl: data.user.user_metadata?.avatar_url || "/images/avatar_krish.png",
          id: data.user.id,
        });
      } else {
        setUserProfile({
          email: "rider@ridex.nagpur",
          fullName: "Krish Bangade",
          avatarUrl: "/images/avatar_krish.png",
          id: "u-krish-01",
        });
      }
    });

    if (activeTab === "history") {
      setLoadingRides(true);
      fetch("http://localhost:5000/api/rides", {
        headers: {
          Authorization: "Bearer rider_token",
          "x-demo-user-id": "u-krish-01",
        },
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setRides(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingRides(false));
    }

    if (activeTab === "saved") {
      fetch("http://localhost:5000/api/profile/saved-places", {
        headers: {
          Authorization: "Bearer rider_token",
          "x-demo-user-id": "u-krish-01",
        },
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setSavedPlaces(res.data);
          }
        })
        .catch(() => {});
    }
  }, [activeTab]);

  // Handle adding new saved place
  const handleAddSavedPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceLabel.trim() || !newPlaceAddress.trim()) return;

    try {
      const res = await fetch("http://localhost:5000/api/profile/saved-places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer rider_token",
          "x-demo-user-id": "u-krish-01",
        },
        body: JSON.stringify({
          label: newPlaceLabel,
          address: newPlaceAddress,
          latitude: 21.1458,
          longitude: 79.0882,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSavedPlaces((prev) => [...prev, data.data]);
        setNewPlaceLabel("");
        setNewPlaceAddress("");
        setIsAddingPlace(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle deleting saved place
  const handleDeletePlace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:5000/api/profile/saved-places/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer rider_token",
          "x-demo-user-id": "u-krish-01",
        },
      });
      setSavedPlaces((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (activeTab === "home" || activeTab === "rider-dashboard") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12151e] border border-[#232938] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-left max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1c2230] bg-[#151924]">
          <div className="flex items-center gap-3">
            {activeTab === "history" && <History className="text-[#bef264]" size={20} />}
            {activeTab === "saved" && <Bookmark className="text-[#bef264]" size={20} />}
            {activeTab === "payments" && <CreditCard className="text-[#bef264]" size={20} />}
            {activeTab === "profile" && <User className="text-[#bef264]" size={20} />}
            {activeTab === "support" && <Headphones className="text-[#bef264]" size={20} />}
            {activeTab === "help" && <HelpCircle className="text-[#bef264]" size={20} />}

            <h3 className="text-base font-bold text-white tracking-tight capitalize">
              {activeTab === "history"
                ? "Live Ride History"
                : activeTab === "saved"
                ? "Saved Places"
                : activeTab === "payments"
                ? "Payment Methods"
                : activeTab === "profile"
                ? "User Account"
                : activeTab === "support"
                ? "RideX 24/7 Support"
                : "Help & FAQ"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1e2434] hover:bg-[#283046] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: RIDE HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {loadingRides ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-7 h-7 rounded-full border-2 border-[#bef264] border-t-transparent animate-spin mb-3" />
                  <p className="text-xs">Fetching live ride database...</p>
                </div>
              ) : rides.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1a2130] text-[#bef264] flex items-center justify-center mx-auto">
                    <History size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-white">No Previous Rides Found</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                    Once you confirm and complete rides across Nagpur, they will appear in this real-time ledger.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#bef264] hover:bg-[#b0e84f] text-black font-bold text-xs"
                  >
                    Book a Ride
                  </button>
                </div>
              ) : (
                rides.map((ride, idx) => (
                  <div
                    key={ride.id || idx}
                    className="p-4 rounded-2xl bg-[#171b26] border border-[#222838] flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase">
                          RideX {ride.rideCategory}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            ride.status === "COMPLETED"
                              ? "text-emerald-400 bg-emerald-500/10"
                              : "text-amber-400 bg-amber-500/10"
                          }`}
                        >
                          {ride.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300">
                        {ride.pickupAddress} → {ride.dropoffAddress}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {new Date(ride.createdAt).toLocaleString()} • {ride.distanceKm} km
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-[#bef264]">
                        ₹{ride.finalFare || ride.fareEstimate}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: SAVED PLACES */}
          {activeTab === "saved" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Your Nagpur Locations
                </span>
                <button
                  onClick={() => setIsAddingPlace(!isAddingPlace)}
                  className="flex items-center gap-1 text-xs text-[#bef264] hover:underline font-bold"
                >
                  <Plus size={14} /> Add Place
                </button>
              </div>

              {isAddingPlace && (
                <form
                  onSubmit={handleAddSavedPlace}
                  className="p-4 rounded-2xl bg-[#161b26] border border-[#293246] space-y-3"
                >
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium">Place Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Campus, Friend's Flat, Office"
                      value={newPlaceLabel}
                      onChange={(e) => setNewPlaceLabel(e.target.value)}
                      className="w-full bg-[#10141e] border border-[#202738] rounded-xl px-3 py-2 text-xs text-white outline-none mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium">Nagpur Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Wardha Road, Civil Lines, Nagpur"
                      value={newPlaceAddress}
                      onChange={(e) => setNewPlaceAddress(e.target.value)}
                      className="w-full bg-[#10141e] border border-[#202738] rounded-xl px-3 py-2 text-xs text-white outline-none mt-1"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingPlace(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#bef264] hover:bg-[#b0e84f] text-black"
                    >
                      Save Location
                    </button>
                  </div>
                </form>
              )}

              {savedPlaces.map((place) => (
                <div
                  key={place.id}
                  onClick={() => {
                    onSelectSavedPlace?.(place.address);
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-[#171b26] border border-[#222838] hover:border-gray-600 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#202636] flex items-center justify-center text-[#bef264]">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-[#bef264]">
                        {place.label}
                      </h4>
                      <p className="text-[11px] text-gray-400">{place.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-sky-400 font-semibold group-hover:underline">
                      Set destination
                    </span>
                    <button
                      onClick={(e) => handleDeletePlace(place.id, e)}
                      className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                      title="Remove place"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#171b26] border border-[#222838] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#1b2746] text-[#4f80ff] px-2 py-1 rounded text-xs font-black">
                    VISA
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Visa ending in 4242</h4>
                    <p className="text-[11px] text-gray-400">Expires 08/29 • Primary Gateway</p>
                  </div>
                </div>
                <span className="text-xs text-[#bef264] font-bold">Default</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#171b26] border border-[#222838] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#382b1b] text-amber-400 px-2 py-1 rounded text-xs font-black">
                    UPI
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">UPI / Google Pay (krish@okaxis)</h4>
                    <p className="text-[11px] text-gray-400">Instant UPI QR & Intent</p>
                  </div>
                </div>
                <button className="text-xs text-sky-400 hover:text-sky-300 font-medium">Use</button>
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-[#bef264] p-0.5">
                <img
                  src={userProfile?.avatarUrl || "/images/avatar_krish.png"}
                  alt="User Avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">
                  {userProfile?.fullName || "Krish Bangade"}
                </h4>
                <p className="text-xs text-gray-400">
                  {userProfile?.email || "krish.bangade@example.com"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-[#171b26] border border-[#222838]">
                  <span className="text-base font-black text-[#bef264]">
                    {rides.length > 0 ? rides.length : "0"}
                  </span>
                  <p className="text-[10px] text-gray-400">Total Rides</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#171b26] border border-[#222838]">
                  <span className="text-base font-black text-amber-400">5.0★</span>
                  <p className="text-[10px] text-gray-400">Rider Rating</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#171b26] border border-[#222838]">
                  <span className="text-base font-black text-sky-400">₹500</span>
                  <p className="text-[10px] text-gray-400">RideX Wallet</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUPPORT / HELP */}
          {(activeTab === "support" || activeTab === "help") && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#171b26] border border-[#222838]">
                <h4 className="text-xs font-bold text-white">24/7 Nagpur Emergency SOS</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Instant connection to RideX Safety & Local Nagpur Police helpline.
                </p>
                <button className="mt-2.5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">
                  Call Safety Team (112)
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#171b26] border border-[#222838]">
                <h4 className="text-xs font-bold text-white">Frequently Asked Questions</h4>
                <div className="mt-2 space-y-1.5 text-[11px] text-gray-300">
                  <p>• Live OpenRouteService turn-by-turn routing is active in Nagpur.</p>
                  <p>• Real driver cars stream telemetry updates every 2 seconds.</p>
                  <p>• Instant ride confirmations connect directly to verified drivers.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
