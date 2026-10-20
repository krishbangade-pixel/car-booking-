"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MapPanel } from "@/components/MapPanel";
import {
  BookingPanel,
  RIDE_OPTIONS,
  RideOption,
} from "@/components/BookingPanel";
import { BookingSummaryModal } from "@/components/BookingSummaryModal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { NavigationDrawers } from "@/components/NavigationDrawers";
import { RiderDashboard } from "@/components/RiderDashboard";
import { useAuth } from "@/context/AuthContext";

export default function RideXDashboard() {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  // Auth guard — redirect unauthenticated users to the auth page
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth");
    }
  }, [user, isLoading, router]);

  // Sub-navigation within each role's dashboard (history, payments, profile, etc.)
  // Does NOT control which role's main view is shown — that is determined solely by `role`.
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Booking locations
  const [pickupLocation, setPickupLocation] = useState("Dharampeth, Nagpur");
  const [dropoffLocation, setDropoffLocation] = useState("Suryodaya College, Nagpur");
  const [pickupCoords, setPickupCoords] = useState<[number, number]>([21.1458, 79.0882]);
  const [dropoffCoords, setDropoffCoords] = useState<[number, number]>([21.1611, 79.1412]);

  // Dynamic route metrics from OpenRouteService
  const [routeDistance, setRouteDistance] = useState(7.5);
  const [routeDuration, setRouteDuration] = useState(9);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [dynamicRides, setDynamicRides] = useState<RideOption[]>(RIDE_OPTIONS);
  const [selectedRide, setSelectedRide] = useState<RideOption>(RIDE_OPTIONS[0]);

  const [geoStatus, setGeoStatus] = useState<"idle" | "ready" | "denied" | "unsupported">("idle");
  const watchIdRef = React.useRef<number | null>(null);

  // Acquire user's real current GPS location as Pickup Location
  const acquireCurrentLocation = React.useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      setPickupLocation((prev) => prev || "Dharampeth, Nagpur");
      setPickupCoords((prev) => prev || [21.1458, 79.0882]);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000,
    };

    const updateFromPosition = async (lat: number, lng: number) => {
      setPickupCoords([lat, lng]);
      setGeoStatus("ready");

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
          setPickupLocation(parts.length > 0 ? parts.join(", ") : data.display_name.split(",").slice(0, 2).join(","));
        } else {
          setPickupLocation("Current Location");
        }
      } catch {
        setPickupLocation("Current Location");
      }
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void updateFromPosition(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        console.warn("Geolocation notice:", err.message);
        setGeoStatus(err.code === 1 ? "denied" : "unsupported");
        setPickupLocation((prev) => prev || "Dharampeth, Nagpur");
        setPickupCoords((prev) => prev || [21.1458, 79.0882]);
      },
      options
    );

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        void updateFromPosition(position.coords.latitude, position.coords.longitude);
      },
      () => {
        // keep last known coordinates; do not reset the rider state
      },
      options
    );
  }, []);

  // Request current location automatically on initial load
  React.useEffect(() => {
    acquireCurrentLocation();
    return () => {
      if (watchIdRef.current !== null && typeof window !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [acquireCurrentLocation]);

  React.useEffect(() => {
    if (geoStatus === "denied") {
      setPickupLocation((prev) => prev || "Dharampeth, Nagpur");
      setPickupCoords((prev) => prev || [21.1458, 79.0882]);
    }
  }, [geoStatus]);

  // Query backend for real fare estimates whenever locations change
  React.useEffect(() => {
    fetch("http://localhost:5000/api/rides/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup: { address: pickupLocation, lat: pickupCoords[0], lng: pickupCoords[1] },
        dropoff: { address: dropoffLocation, lat: dropoffCoords[0], lng: dropoffCoords[1] },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          if (data.data.route) {
            setRouteDistance(data.data.route.distanceKm);
            setRouteDuration(data.data.route.durationMins);
            if (data.data.route.coordinates && Array.isArray(data.data.route.coordinates)) {
              setRouteCoords(data.data.route.coordinates);
            }
          }
          if (Array.isArray(data.data.estimates)) {
            const updated = RIDE_OPTIONS.map((opt) => {
              const match = data.data.estimates.find((e: any) => e.category === opt.id);
              if (match) {
                return {
                  ...opt,
                  estimatedPrice: match.finalFare,
                  priceRange: match.priceRange || `₹${match.finalFare - 15}–${match.finalFare + 20}`,
                  eta: match.etaMinutes ? `${match.etaMinutes} min away` : "–",
                };
              }
              return opt;
            });
            setDynamicRides(updated);
            setSelectedRide((prev) => updated.find((r) => r.id === prev.id) || updated[0]);
          }
        }
      })
      .catch(() => {});
  }, [pickupLocation, dropoffLocation, pickupCoords, dropoffCoords]);

  // Sync sub-navigation default when role changes
  React.useEffect(() => {
    if (!user) {
      setActiveTab("home");
    } else if (role === "rider") {
      setActiveTab("rider-dashboard");
    } else {
      setActiveTab("home");
    }
  }, [user, role]);

  // Handle location selection from Topbar search
  const handleSelectSearchResult = (location: string, type: "pickup" | "dropoff") => {
    import("@/components/Topbar").then(({ NAGPUR_SUGGESTIONS }) => {
      const matched = NAGPUR_SUGGESTIONS.find((s) => s.name === location);
      if (type === "pickup") {
        setPickupLocation(location);
        if (matched) setPickupCoords([matched.lat, matched.lng]);
      } else {
        setDropoffLocation(location);
        if (matched) setDropoffCoords([matched.lat, matched.lng]);
      }
    });
  };

  // Confirm ride click handler with validation
  const handleConfirmRide = () => {
    if (!pickupLocation.trim()) {
      alert("Please enter a pickup location.");
      return;
    }
    if (!dropoffLocation.trim()) {
      alert("Please enter a drop-off destination.");
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Dashboard is determined SOLELY by the user's registered role.
  // Customers → Customer Booking UI.
  // Riders → Rider / Driver Console.
  // No manual switching is possible from anywhere in the app.
  // ────────────────────────────────────────────────────────────────────────────
  const showRiderDashboard = !!user && role === "rider";

  // Show spinner while auth resolves or while redirecting
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#bef264] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0f] text-gray-100 font-sans">
      {/* 1. Left Sidebar — shows role-specific nav items, no switching buttons */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
      />

      {/* 2. Main Viewport — strictly role-based */}
      {showRiderDashboard ? (
        /* Riders always see their Driver Console */
        <RiderDashboard />
      ) : (
        /* Customers (and unauthenticated visitors) always see the booking UI */
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#090a0f]">
          <Topbar
            onSelectSearchResult={handleSelectSearchResult}
            onOpenHelp={() => setActiveTab("help")}
            onOpenAuth={() => router.push("/auth")}
          />

          <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            <MapPanel
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              pickupCoords={pickupCoords}
              dropoffCoords={dropoffCoords}
              routeCoords={routeCoords}
              distanceKm={routeDistance}
              durationMins={routeDuration}
            />

            <BookingPanel
              pickupLocation={pickupLocation}
              setPickupLocation={setPickupLocation}
              dropoffLocation={dropoffLocation}
              setDropoffLocation={setDropoffLocation}
              selectedRide={selectedRide}
              setSelectedRide={setSelectedRide}
              onConfirmRide={handleConfirmRide}
              onAddStop={() => setActiveTab("saved")}
              onSeeMore={() => alert("Showing all available RideX vehicles in Nagpur area.")}
              rideOptions={dynamicRides}
              onUseCurrentLocation={acquireCurrentLocation}
            />
          </main>
        </div>
      )}

      {/* Modals */}
      <BookingSummaryModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        selectedRide={selectedRide}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        pickupCoords={pickupCoords}
        dropoffCoords={dropoffCoords}
        distanceKm={routeDistance}
        durationMins={routeDuration}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      <NavigationDrawers
        activeTab={activeTab}
        onClose={() => setActiveTab(role === "rider" ? "rider-dashboard" : "home")}
        onSelectSavedPlace={(place) => setDropoffLocation(place)}
      />
    </div>
  );
}
