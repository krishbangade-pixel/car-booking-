"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Power,
  TrendingUp,
  Clock,
  Star,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Car,
  Fuel,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Smartphone,
  RefreshCw,
  LogOut,
  Sliders,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

// Dynamically import the RealTimeMap with SSR disabled
const RealTimeMap = dynamic(
  () => import("@/components/RealTimeMap").then((mod) => mod.RealTimeMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#10121a] text-gray-400 gap-3">
        <div className="w-8 h-8 border-2 border-[#bef264] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Initializing Rider GPS Telemetry...</span>
      </div>
    ),
  }
);

interface ActiveTrip {
  id: string;
  customerName: string;
  customerPhone: string;
  customerRating: number;
  pickup: string;
  dropoff: string;
  fare: number;
  distanceKm: number;
  durationMins: number;
  status: "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED";
  pickupCoords: [number, number];
  dropoffCoords: [number, number];
  otp: string;
}

interface RiderDashboardProps {
  // Role is locked — no cross-dashboard switching
}

export const RiderDashboard: React.FC<RiderDashboardProps> = () => {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = React.useState<string | null>(null);

  // Load real Supabase access token once on mount
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
    // Refresh token if it changes (e.g. after silent refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const demoDriverHeaders = React.useMemo(
    () => ({
      "x-demo-user-id": "11111111-1111-1111-1111-111111111111",
      "x-demo-role": "driver",
      "x-demo-name": "Rajesh Sharma",
      "x-demo-email": "rajesh.sharma@example.com",
    }),
    []
  );

  // Build real auth headers — stored in a ref so fetchRealData doesn't need it as a dep
  const authHeadersRef = React.useRef<Record<string, string>>({ ...demoDriverHeaders });
  React.useEffect(() => {
    authHeadersRef.current = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : { ...demoDriverHeaders };
  }, [accessToken, demoDriverHeaders]);

  // Rider Status State
  const [isOnline, setIsOnline] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<[number, number]>([21.1458, 79.0882]); // Nagpur center
  const [currentAddress, setCurrentAddress] = useState("Dharampeth, Nagpur");
  const geoWatchRef = React.useRef<number | null>(null);

  // Metrics initialized from real API (starts at 0)
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [completedTrips, setCompletedTrips] = useState(0);
  const [rating, setRating] = useState(5.0);
  const [acceptanceRate, setAcceptanceRate] = useState(100);

  // Incoming Live Request from real backend / Supabase
  const [incomingRequest, setIncomingRequest] = useState<{
    id: string;
    customerName: string;
    customerPhone: string;
    customerRating: number;
    pickup: string;
    dropoff: string;
    fare: number;
    distanceKm: number;
    durationMins: number;
    pickupCoords: [number, number];
    dropoffCoords: [number, number];
    timeLeft: number;
    otp?: string;
  } | null>(null);

  // Active Trip State
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const activeTripRef = React.useRef<ActiveTrip | null>(null);
  // Keep ref in sync with state
  React.useEffect(() => { activeTripRef.current = activeTrip; }, [activeTrip]);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [tripCompletedSuccess, setTripCompletedSuccess] = useState(false);
  const [recentCompletedRides, setRecentCompletedRides] = useState<any[]>([]);

  // Fetch real earnings + incoming ride requests from backend
  // Uses refs for authHeaders/activeTrip so objects are NOT in useCallback deps
  const fetchRealData = React.useCallback(async () => {
    const headers = authHeadersRef.current;

    // 1. Driver earnings & total completed rides
    try {
      const earningsRes = await fetch("http://localhost:5000/api/driver/earnings", { headers });
      const earningsJson = await earningsRes.json();
      if (earningsJson.success && earningsJson.data) {
        setTodayEarnings(earningsJson.data.today || 0);
        setCompletedTrips(earningsJson.data.totalRides || 0);
      }
    } catch { /* network */ }

    // 2. Pending ride requests — only poll when online and no active trip
    if (isOnline && !activeTripRef.current) {
      try {
        const reqRes = await fetch("http://localhost:5000/api/driver/requests", { headers });
        const reqJson = await reqRes.json();
        if (reqJson.success && Array.isArray(reqJson.data) && reqJson.data.length > 0) {
          const firstReq = reqJson.data[0];
          setIncomingRequest((prev) => {
            if (prev && prev.id === firstReq.id) return prev;
            return {
              id: firstReq.id,
              customerName: firstReq.customerName || "Passenger",
              customerPhone: firstReq.customerPhone || "",
              customerRating: firstReq.customerRating || 4.8,
              pickup: firstReq.pickup || "Nagpur",
              dropoff: firstReq.dropoff || "Nagpur",
              fare: firstReq.fare || 180,
              distanceKm: firstReq.distanceKm || 5.0,
              durationMins: firstReq.durationMins || 10,
              pickupCoords: (firstReq.pickupCoords as [number, number]) || [21.1458, 79.0882],
              dropoffCoords: (firstReq.dropoffCoords as [number, number]) || [21.1611, 79.1412],
              otp: firstReq.otp || "",
              timeLeft: 30,
            };
          });
        } else {
          setIncomingRequest((prev) => (prev ? null : prev));
        }
      } catch { /* network */ }
    }
  }, [isOnline]);

  useEffect(() => {
    fetchRealData();
    const pollInterval = setInterval(fetchRealData, 4000);
    return () => clearInterval(pollInterval);
  }, [fetchRealData]);

  const resolveAddressFromCoords = React.useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const parts = [
          addr.road || addr.suburb || addr.neighbourhood,
          addr.city || addr.town || addr.state_district,
        ].filter(Boolean);
        setCurrentAddress(parts.length > 0 ? parts.join(", ") : data.display_name.split(",").slice(0, 2).join(","));
      } else {
        setCurrentAddress("Current Location");
      }
    } catch {
      setCurrentAddress("Current Location");
    }
  }, []);

  const pushDriverLocation = React.useCallback(async (lat: number, lng: number) => {
    try {
      await fetch("http://localhost:5000/api/driver/location", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeadersRef.current,
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          heading: 0,
        }),
      });
    } catch {
      // silently ignore location sync failures; UI should still keep the rider moving
    }
  }, []);

  // Acquire rider's real GPS position
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.log("Rider GPS location fallback:", err.message),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    const onPosition = (pos: GeolocationPosition) => {
      const nextCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setCurrentCoords(nextCoords);
      void resolveAddressFromCoords(nextCoords[0], nextCoords[1]);
      void pushDriverLocation(nextCoords[0], nextCoords[1]);
    };

    navigator.geolocation.getCurrentPosition(onPosition, (err) => {
      console.warn("Rider GPS location fallback:", err.message);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });

    if (geoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
    }

    geoWatchRef.current = navigator.geolocation.watchPosition(onPosition, () => {}, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });

    return () => {
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
    };
  }, [pushDriverLocation, resolveAddressFromCoords]);

  // Countdown timer for incoming request — use a ref for timeLeft to avoid effect loop
  const timeLeftRef = React.useRef(0);
  useEffect(() => {
    if (!incomingRequest) {
      timeLeftRef.current = 0;
      return;
    }
    timeLeftRef.current = incomingRequest.timeLeft;
    const timer = setInterval(() => {
      timeLeftRef.current -= 1;
      if (timeLeftRef.current <= 0) {
        clearInterval(timer);
        setIncomingRequest(null);
      } else {
        setIncomingRequest((prev) => prev ? { ...prev, timeLeft: timeLeftRef.current } : null);
      }
    }, 1000);
    return () => clearInterval(timer);
  // Only restart when a NEW request arrives (id changes), not on every timeLeft tick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingRequest?.id, isOnline]);

  // Handle Online / Offline toggle
  const toggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (!nextState) {
      setIncomingRequest(null);
    }

    try {
      await fetch("http://localhost:5000/api/driver/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeadersRef.current },
        body: JSON.stringify({ isAvailable: nextState }),
      });
    } catch { /* network */ }
  };

  // Accept incoming ride request
  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;
    const newTrip: ActiveTrip = {
      id: incomingRequest.id,
      customerName: incomingRequest.customerName,
      customerPhone: incomingRequest.customerPhone,
      customerRating: incomingRequest.customerRating,
      pickup: incomingRequest.pickup,
      dropoff: incomingRequest.dropoff,
      fare: incomingRequest.fare,
      distanceKm: incomingRequest.distanceKm,
      durationMins: incomingRequest.durationMins,
      status: "ACCEPTED",
      pickupCoords: incomingRequest.pickupCoords,
      dropoffCoords: incomingRequest.dropoffCoords,
      otp: incomingRequest.otp || "", // Use real OTP from ride data
    };
    setActiveTrip(newTrip);
    setIncomingRequest(null);
    setTripCompletedSuccess(false);

    try {
      await fetch(`http://localhost:5000/api/driver/rides/${incomingRequest.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeadersRef.current },
        body: JSON.stringify({ status: "ACCEPTED" }),
      });
    } catch {}
  };

  // Advance Trip Status
  const handleMarkArrived = async () => {
    if (activeTrip) {
      setActiveTrip({ ...activeTrip, status: "ARRIVED" });
      try {
        await fetch(`http://localhost:5000/api/driver/rides/${activeTrip.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeadersRef.current },
          body: JSON.stringify({ status: "ARRIVING" }),
        });
      } catch {}
    }
  };

  const handleStartTrip = async () => {
    if (!activeTrip) return;
    if (enteredOtp.trim() !== activeTrip.otp) {
      setOtpError("Invalid 4-Digit OTP. Ask passenger for code.");
      return;
    }
    setOtpError("");
    setActiveTrip({ ...activeTrip, status: "IN_PROGRESS" });

    try {
      await fetch(`http://localhost:5000/api/driver/rides/${activeTrip.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeadersRef.current },
        body: JSON.stringify({ status: "IN_PROGRESS", otp: enteredOtp }),
      });
    } catch {}
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    const completedFare = activeTrip.fare;
    const completedId = activeTrip.id;

    setTodayEarnings((prev) => prev + completedFare);
    setCompletedTrips((prev) => prev + 1);
    setTripCompletedSuccess(true);
    setActiveTrip(null);
    setEnteredOtp("");

    try {
      await fetch(`http://localhost:5000/api/driver/rides/${completedId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeadersRef.current },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
    } catch {}

    fetchRealData();
  };

  const riderPhone =
    user?.user_metadata?.phone || "+91 98230 45678";
  const riderName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Krish Bangade";

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#090a0f] text-gray-100">
      {/* 1. Rider Top Console Header */}
      <header className="h-[68px] min-h-[68px] bg-[#0d0f14] border-b border-[#1a1d26] flex items-center justify-between px-6 z-20">
        {/* Left: Driver Identity & Vehicle Info */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#bef264] to-emerald-400 p-0.5">
              <div className="w-full h-full rounded-full bg-[#141722] flex items-center justify-center font-black text-[#bef264] text-sm">
                {riderName.charAt(0).toUpperCase()}
              </div>
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#0d0f14] ${
                isOnline ? "bg-[#bef264]" : "bg-gray-500"
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">{riderName}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#bef264]/10 text-[#bef264] border border-[#bef264]/20 flex items-center gap-1">
                <Car size={10} /> RIDER / DRIVER
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
              <span className="text-gray-300 font-medium">Toyota Innova Crysta</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400 font-mono text-[11px]">MH 31 EF 1010</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400 font-mono text-[11px] flex items-center gap-1">
                <Smartphone size={11} className="text-[#bef264]" />
                {riderPhone}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Switch Mode & Online Toggle */}
        <div className="flex items-center gap-4">

          {/* Online / Offline Master Toggle */}
          <button
            onClick={toggleOnline}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 ${
              isOnline
                ? "bg-[#bef264] hover:bg-[#b0e84f] text-black shadow-[#bef264]/10"
                : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
            }`}
          >
            <Power size={14} strokeWidth={2.5} />
            <span>{isOnline ? "GO OFFLINE" : "GO ONLINE"}</span>
          </button>
        </div>
      </header>

      {/* 2. Rider Dashboard Main View: Left Controls / Right Live Telemetry Map */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Side: Performance Metrics & Ride Management (460px) */}
        <div className="w-full lg:w-[460px] min-w-[360px] bg-[#0c0e14] border-r border-[#1a1d26] flex flex-col h-full overflow-y-auto p-5 space-y-5">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
              isOnline
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                : "bg-gray-900/60 border-gray-800 text-gray-400"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isOnline ? "bg-[#bef264] animate-pulse" : "bg-gray-500"
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider">
                {isOnline ? "Online & Searching Rides in Nagpur" : "Currently Offline (Tap to Go Online)"}
              </span>
            </div>
            {isOnline && (
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-900/40 px-2 py-0.5 rounded-full">
                GPS Active
              </span>
            )}
          </div>

          {/* Today's Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Earnings Card */}
            <div className="bg-[#13151f] border border-[#1f2330] rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-semibold">Today&apos;s Earnings</span>
                <TrendingUp size={16} className="text-[#bef264]" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-white">₹{todayEarnings.toLocaleString()}</span>
                <p className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                  <span>+₹320 vs yesterday</span>
                </p>
              </div>
            </div>

            {/* Trips Completed */}
            <div className="bg-[#13151f] border border-[#1f2330] rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-semibold">Trips Done</span>
                <CheckCircle2 size={16} className="text-blue-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-white">{completedTrips}</span>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                  Target: 12 trips today
                </p>
              </div>
            </div>

            {/* Rider Rating */}
            <div className="bg-[#13151f] border border-[#1f2330] rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-semibold">Rating</span>
                <Star size={16} className="text-amber-400 fill-amber-400" />
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white">{rating}</span>
                  <span className="text-xs text-gray-400">/ 5.0</span>
                </div>
                <p className="text-[11px] text-amber-400 font-medium mt-0.5">
                  Top Rated Partner
                </p>
              </div>
            </div>

            {/* Acceptance Rate */}
            <div className="bg-[#13151f] border border-[#1f2330] rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-semibold">Acceptance</span>
                <Sparkles size={16} className="text-purple-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-white">{acceptanceRate}%</span>
                <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                  High Priority Status
                </p>
              </div>
            </div>
          </div>

          {/* Trip Completion Success Alert */}
          {tripCompletedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-[#bef264] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">Trip Completed Successfully!</p>
                <p className="text-[11px] text-emerald-300 mt-0.5">
                  Payment has been credited to your RideX Partner wallet. Ready for next ride.
                </p>
              </div>
            </div>
          )}

          {/* ACTIVE TRIP IN PROGRESS CONTAINER */}
          {activeTrip && (
            <div className="bg-[#141724] border border-[#2b3145] rounded-2xl p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-[#bef264] tracking-widest uppercase">
                    CURRENT ACTIVE TRIP
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    {activeTrip.customerName}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-[#bef264]">₹{activeTrip.fare}</span>
                  <p className="text-[10px] text-gray-400">Cash / RideX Pay</p>
                </div>
              </div>

              {/* Pickup & Destination */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#bef264] mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Pickup</span>
                    <p className="text-gray-200 font-medium">{activeTrip.pickup}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Drop-off</span>
                    <p className="text-gray-200 font-medium">{activeTrip.dropoff}</p>
                  </div>
                </div>
              </div>

              {/* Status Stepper Actions */}
              {activeTrip.status === "ACCEPTED" && (
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] text-gray-300">
                    Drive towards pickup point in Nagpur. Tap below once you have arrived.
                  </p>
                  <button
                    onClick={handleMarkArrived}
                    className="w-full bg-[#bef264] hover:bg-[#b0e84f] text-black font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
                  >
                    I HAVE ARRIVED AT PICKUP
                  </button>
                </div>
              )}

              {activeTrip.status === "ARRIVED" && (
                <div className="space-y-3 pt-2 bg-[#0c0e14] p-3 rounded-xl border border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Enter Passenger 4-Digit OTP</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Test OTP: {activeTrip.otp}</span>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={enteredOtp}
                    onChange={(e) => {
                      setEnteredOtp(e.target.value);
                      setOtpError("");
                    }}
                    placeholder="Enter 4-digit OTP"
                    className="w-full bg-[#181b24] border border-gray-700 text-center text-lg font-mono tracking-widest text-white rounded-xl py-2 outline-none focus:border-[#bef264]"
                  />
                  {otpError && <p className="text-[11px] text-rose-400">{otpError}</p>}
                  <button
                    onClick={handleStartTrip}
                    className="w-full bg-[#bef264] hover:bg-[#b0e84f] text-black font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
                  >
                    VERIFY OTP & START TRIP
                  </button>
                </div>
              )}

              {activeTrip.status === "IN_PROGRESS" && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <Navigation size={16} className="text-[#bef264] animate-spin" />
                    <span>Trip in progress. Follow map navigation to destination.</span>
                  </div>
                  <button
                    onClick={handleCompleteTrip}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 rounded-xl text-xs transition-all shadow-lg active:scale-95"
                  >
                    COMPLETE TRIP (COLLECT ₹{activeTrip.fare})
                  </button>
                </div>
              )}

              {/* Customer Contact Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={`tel:${activeTrip.customerPhone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-[#1a1e2c] hover:bg-[#22283b] text-gray-200 border border-gray-800 transition-colors"
                >
                  <Phone size={13} className="text-[#bef264]" />
                  <span>Call Customer</span>
                </a>
                <button
                  onClick={() => alert("Connecting live chat with passenger...")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-[#1a1e2c] hover:bg-[#22283b] text-gray-200 border border-gray-800 transition-colors"
                >
                  <MessageSquare size={13} className="text-blue-400" />
                  <span>Chat</span>
                </button>
              </div>
            </div>
          )}

          {/* INCOMING RIDE REQUEST CARD */}
          {!activeTrip && incomingRequest && isOnline && (
            <div className="relative bg-gradient-to-b from-[#191d2c] to-[#12141e] border-2 border-[#bef264] rounded-2xl p-4.5 space-y-4 shadow-2xl shadow-[#bef264]/10 animate-in fade-in zoom-in-95 duration-200">
              {/* Header with Circular Countdown */}
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#bef264] animate-ping" />
                  <span className="text-xs font-extrabold text-[#bef264] tracking-wide uppercase">
                    INCOMING RIDE REQUEST
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-[#bef264]/10 px-2.5 py-1 rounded-full text-xs font-mono font-bold text-[#bef264] border border-[#bef264]/30">
                  <Clock size={12} />
                  <span>{incomingRequest.timeLeft}s</span>
                </div>
              </div>

              {/* Customer Profile Row */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{incomingRequest.customerName}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                    <Star size={11} className="fill-amber-400" />
                    <span>{incomingRequest.customerRating} Rating</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white">₹{incomingRequest.fare}</span>
                  <p className="text-[10px] text-gray-400">
                    {incomingRequest.distanceKm} km • ~{incomingRequest.durationMins} mins
                  </p>
                </div>
              </div>

              {/* Route Details */}
              <div className="bg-[#0c0e14] border border-[#1e222e] rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#bef264] mt-1 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Pickup</span>
                    <p className="text-gray-200 font-medium truncate">{incomingRequest.pickup}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Destination</span>
                    <p className="text-gray-200 font-medium truncate">{incomingRequest.dropoff}</p>
                  </div>
                </div>
              </div>

              {/* Accept & Decline Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setIncomingRequest(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#1a1e2a] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-gray-800 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptRequest}
                  className="flex-2 py-3 rounded-xl text-xs font-extrabold bg-[#bef264] hover:bg-[#b0e84f] text-black shadow-lg shadow-[#bef264]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>ACCEPT RIDE (₹{incomingRequest.fare})</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Idle Waiting State */}
          {!activeTrip && !incomingRequest && isOnline && (
            <div className="p-6 rounded-2xl bg-[#13151f] border border-[#1e222e] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#bef264]/10 text-[#bef264] flex items-center justify-center mx-auto">
                <RefreshCw size={20} className="animate-spin" />
              </div>
              <h4 className="text-sm font-bold text-white">Radar Active in Nagpur</h4>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                Matching you with real passenger requests booked through RideX across Nagpur. Keep GPS active.
              </p>
            </div>
          )}

          {/* Offline Placeholder */}
          {!isOnline && (
            <div className="p-6 rounded-2xl bg-[#13151f] border border-gray-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
                <Power size={22} />
              </div>
              <h4 className="text-sm font-bold text-gray-300">You Are Offline</h4>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                Go online above to start receiving real cab requests from passengers in your area.
              </p>
            </div>
          )}

          {/* Recent Trips Log */}
          <div className="mt-4 pt-4 border-t border-gray-800/80">
            <h5 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
              Recent Completed Rides
            </h5>
            {recentCompletedRides.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-[#13151f] border border-[#1e222e] text-center text-xs text-gray-500">
                No rides completed yet today. Completed trips will appear here automatically.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {recentCompletedRides.map((ride, idx) => (
                  <div
                    key={ride.id || idx}
                    className="p-3 rounded-xl bg-[#13151f] border border-[#1e222e] flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {ride.pickupAddress?.split(",")[0] || "Nagpur"} → {ride.dropoffAddress?.split(",")[0] || "Destination"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(ride.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {ride.rideCategory?.toUpperCase() || "RideX"}
                      </p>
                    </div>
                    <span className="font-bold text-[#bef264]">₹{ride.finalFare}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Real-Time Nagpur GPS Navigation Map */}
        <div className="flex-1 relative h-full min-h-[400px] bg-[#10121a]">
          {/* Real-time OpenStreetMap with Vehicle telemetry */}
          <RealTimeMap
            pickupCoords={activeTrip ? activeTrip.pickupCoords : currentCoords}
            dropoffCoords={
              activeTrip
                ? activeTrip.dropoffCoords
                : incomingRequest
                ? incomingRequest.dropoffCoords
                : undefined
            }
            pickupLabel={activeTrip ? activeTrip.pickup : currentAddress}
            dropoffLabel={
              activeTrip
                ? activeTrip.dropoff
                : incomingRequest
                ? incomingRequest.dropoff
                : undefined
            }
            interactive={true}
          />

          {/* Floating Driver HUD Overlay */}
          <div className="absolute top-4 left-4 z-[500] bg-[#0d0f14]/90 backdrop-blur-md border border-[#232838] rounded-2xl px-4 py-2.5 shadow-xl flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#bef264] animate-ping" />
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                RIDER GPS TELEMETRY
              </p>
              <p className="text-xs font-semibold text-white">
                {currentCoords[0].toFixed(4)}° N, {currentCoords[1].toFixed(4)}° E (Nagpur Hub)
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
