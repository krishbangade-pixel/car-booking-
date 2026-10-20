"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Crosshair,
  Plus,
  Minus,
  ShieldCheck,
  MapPin,
} from "lucide-react";

// Dynamically import RealTimeMap with SSR disabled (Leaflet requires browser window)
const RealTimeMap = dynamic(
  () => import("./RealTimeMap").then((mod) => mod.RealTimeMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0d1017] text-gray-400 text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#bef264] border-t-transparent animate-spin" />
          <span>Loading Real-time Nagpur Map...</span>
        </div>
      </div>
    ),
  }
);

interface MapPanelProps {
  pickupLocation: string;
  dropoffLocation: string;
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  routeCoords?: [number, number][];
  distanceKm?: number;
  durationMins?: number;
}

export const MapPanel: React.FC<MapPanelProps> = ({
  pickupLocation,
  dropoffLocation,
  pickupCoords = [21.1458, 79.0882], // Dharampeth, Nagpur
  dropoffCoords = [21.1611, 79.1412], // Suryodaya College / New Kamptee Rd
  routeCoords = [],
  distanceKm = 7.5,
  durationMins = 9,
}) => {
  const [mapMode, setMapMode] = useState<"map" | "satellite">("map");
  const [drivers, setDrivers] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      lat: number;
      lng: number;
      vehiclePlate: string;
      etaMins?: number;
    }>
  >([]);

  // Stable key so the effect doesn't restart on every render (new array reference)
  const pickupKey = `${pickupCoords[0]},${pickupCoords[1]}`;

  // Fetch ONLY real active drivers from the backend — no fake fallbacks
  // Poll every 15 seconds for live position updates
  useEffect(() => {
    let cancelled = false;
    const [lat, lng] = pickupCoords;

    const fetchDrivers = () => {
      fetch(`http://localhost:5000/api/drivers/nearby?lat=${lat}&lng=${lng}`)
        .then((res) => res.json())
        .then((res) => {
          if (cancelled) return;
          if (res.success && Array.isArray(res.data)) {
            setDrivers(res.data);
          } else {
            setDrivers([]);
          }
        })
        .catch(() => {
          if (!cancelled) setDrivers([]);
        });
    };

    fetchDrivers();
    const interval = setInterval(fetchDrivers, 15_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupKey]);

  return (
    <div className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto">
      {/* Center Real-Time Interactive Map Container */}
      <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-[#1e2330] bg-[#0c1017] shadow-2xl select-none group">
        {/* Real Leaflet Map with CartoDB Dark Matter / Esri Satellite & ORS Turn-by-Turn Route */}
        <RealTimeMap
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          routeCoords={routeCoords}
          drivers={drivers}
          mapMode={mapMode}
          zoomLevel={13}
        />

        {/* Real-time OpenRouteService Travel Time & Distance Badge */}
        <div className="absolute left-1/2 top-14 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-[#10141d]/95 backdrop-blur-md border border-[#232d3f] px-3.5 py-1.5 rounded-xl shadow-2xl flex flex-col items-center">
            <span className="text-white text-xs font-bold leading-tight">
              {durationMins} min
            </span>
            <span className="text-gray-400 text-[10px] leading-tight font-medium">
              ({distanceKm} km)
            </span>
          </div>
        </div>

        {/* ===================== TOP-LEFT MAP CONTROLS ===================== */}
        <div className="absolute top-4 left-4 z-20 flex items-center bg-[#141722]/90 backdrop-blur-md border border-[#202534] rounded-xl p-1 shadow-lg">
          <button
            onClick={() => setMapMode("map")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mapMode === "map"
                ? "bg-white text-black shadow-md"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setMapMode("satellite")}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mapMode === "satellite"
                ? "bg-white text-black shadow-md font-bold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Satellite
          </button>
        </div>

        {/* Live GPS Route Provider & Active Cabs Radar Tag */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
          <span className="bg-[#10141d]/90 backdrop-blur-md border border-[#232d3f] text-[#bef264] text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${drivers.length > 0 ? "bg-[#bef264] animate-ping" : "bg-gray-500"}`} />
            <span>{drivers.length > 0 ? `${drivers.length} Cab${drivers.length === 1 ? "" : "s"} Active Near You` : "No Cabs Active Near You"}</span>
          </span>
          {drivers.length > 0 && (
            <span className="hidden sm:inline-flex bg-[#10141d]/90 backdrop-blur-md border border-[#232d3f] text-sky-400 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-md items-center gap-1">
              <span>Nearest: {Math.min(...drivers.map((d) => d.etaMins ?? 99))} min away</span>
            </span>
          )}
        </div>
      </div>

      {/* ===================== THREE INFORMATIONAL CARDS ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Safe Rides */}
        <div className="relative h-[124px] rounded-2xl overflow-hidden border border-[#1e222e] bg-[#12141c] group cursor-pointer hover:border-gray-700 transition-all">
          <Image
            src="/images/safe_rides.png"
            alt="Safe Rides"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 flex flex-col justify-end">
            <div className="w-6 h-6 rounded-md bg-[#181d28]/90 border border-[#283244] flex items-center justify-center text-white mb-2 shadow">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <h4 className="text-white font-bold text-sm tracking-tight">Safe Rides</h4>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              Verified drivers and real-time tracking.
            </p>
          </div>
        </div>

        {/* Card 2: Anywhere in Nagpur */}
        <div className="relative h-[124px] rounded-2xl overflow-hidden border border-[#1e222e] bg-[#12141c] group cursor-pointer hover:border-gray-700 transition-all">
          <Image
            src="/images/nagpur_city.png"
            alt="Anywhere in Nagpur"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 flex flex-col justify-end">
            <div className="w-6 h-6 rounded-md bg-[#181d28]/90 border border-[#283244] flex items-center justify-center text-white mb-2 shadow">
              <MapPin size={14} className="text-white" />
            </div>
            <h4 className="text-white font-bold text-sm tracking-tight">Anywhere in Nagpur</h4>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              Reliable rides, anytime, anywhere.
            </p>
          </div>
        </div>

        {/* Card 3: Affordable Rates */}
        <div className="relative h-[124px] rounded-2xl overflow-hidden border border-[#1e222e] bg-[#12141c] group cursor-pointer hover:border-gray-700 transition-all">
          <Image
            src="/images/affordable_rates.png"
            alt="Affordable Rates"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 flex flex-col justify-end">
            <div className="w-6 h-6 rounded-md bg-[#181d28]/90 border border-[#283244] flex items-center justify-center text-white mb-2 shadow">
              <span className="text-xs font-bold text-white">₹</span>
            </div>
            <h4 className="text-white font-bold text-sm tracking-tight">Affordable Rates</h4>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              Get the best fares for your journey.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
