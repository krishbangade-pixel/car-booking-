"use client";

import React, { useState, useEffect } from "react";

import {
  X,
  CheckCircle2,
  ShieldCheck,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  Car,
  AlertCircle,
  User,
} from "lucide-react";
import { RideOption } from "./BookingPanel";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface BookingSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRide: RideOption;
  pickupLocation: string;
  dropoffLocation: string;
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  distanceKm?: number;
  durationMins?: number;
}

export const BookingSummaryModal: React.FC<BookingSummaryModalProps> = ({
  isOpen,
  onClose,
  selectedRide,
  pickupLocation,
  dropoffLocation,
  pickupCoords = [21.1458, 79.0882],
  dropoffCoords = [21.1611, 79.1412],
  distanceKm = 7.5,
  durationMins = 9,
}) => {
  const { user } = useAuth();
  const [bookingStep, setBookingStep] = useState<"matching" | "confirmed" | "no_drivers">("matching");
  const [tripStatus, setTripStatus] = useState<"searching" | "accepted" | "en_route" | "arrived">("searching");
  const [driverInfo, setDriverInfo] = useState<{
    name: string;
    rating: string;
    vehicle: string;
    otp: string;
    eta: string;
  } | null>(null);

  const tripStatusMeta = {
    searching: {
      title: "Finding your RideX Driver...",
      subtitle: "Connecting to nearby Nagpur drivers",
      badge: "Searching",
    },
    accepted: {
      title: "Driver accepted your ride",
      subtitle: "Your cab is on the way to pickup",
      badge: "Accepted",
    },
    en_route: {
      title: "Ride in progress",
      subtitle: "Driver is heading to your pickup point",
      badge: "En route",
    },
    arrived: {
      title: "Driver has arrived",
      subtitle: "Please meet the driver at pickup point",
      badge: "Arrived",
    },
  } as const;

  // Stable string keys so coord arrays don't cause infinite re-triggers
  const pickupKey = `${pickupCoords[0]},${pickupCoords[1]}`;
  const dropoffKey = `${dropoffCoords[0]},${dropoffCoords[1]}`;

  useEffect(() => {
    if (!isOpen) return;
    setBookingStep("matching");
    setDriverInfo(null);

    const demoHeaders = {
      "x-demo-user-id": "test_rider_1",
      "x-demo-role": "rider",
      "x-demo-name": "Krish Bangade",
      "x-demo-email": "krish.bangade@example.com",
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token;
      const userId = user?.id;

      fetch("http://localhost:5000/api/rides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(token ? {} : demoHeaders),
        },
        body: JSON.stringify({
          pickup: { address: pickupLocation, lat: pickupCoords[0], lng: pickupCoords[1] },
          dropoff: { address: dropoffLocation, lat: dropoffCoords[0], lng: dropoffCoords[1] },
          rideCategory: selectedRide.id,
          paymentMethod: "card",
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            const data = res.data;
            if (data.driver) {
              setDriverInfo({
                name: data.driver.name || "Assigned Driver",
                rating: `${data.driver.rating || 4.9} ★`,
                vehicle: `${data.driver.vehicleColor || ""} ${data.driver.vehicleMake || ""} ${data.driver.vehicleModel || ""} • ${data.driver.vehiclePlate || ""}`.trim(),
                otp: data.otp || "",
                eta: data.driver.etaMins ? `${data.driver.etaMins} mins` : "En route",
              });
              setBookingStep("confirmed");
            } else {
              setDriverInfo(null);
              setBookingStep("confirmed");
            }
          } else {
            setBookingStep("confirmed");
          }
        })
        .catch(() => setBookingStep("confirmed"));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pickupLocation, dropoffLocation, pickupKey, dropoffKey, selectedRide.id, user?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12151e] border border-[#232938] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-left">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1c2230] bg-[#151924]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#bef264]/10 border border-[#bef264]/30 flex items-center justify-center text-[#bef264]">
              <Car size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {bookingStep === "matching"
                  ? tripStatusMeta[tripStatus].title
                  : bookingStep === "no_drivers"
                  ? "No drivers available"
                  : "Ride Confirmed!"}
              </h3>
              <p className="text-xs text-gray-400">
                {bookingStep === "matching"
                  ? tripStatusMeta[tripStatus].subtitle
                  : bookingStep === "no_drivers"
                  ? "Please try again in a few minutes."
                  : "Driver is heading to pickup point"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bookingStep === "matching" && (
              <span className="px-2 py-1 rounded-full text-[10px] font-bold border border-[#bef264]/30 bg-[#bef264]/10 text-[#bef264]">
                {tripStatusMeta[tripStatus].badge}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1e2434] hover:bg-[#283046] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {bookingStep === "matching" ? (
            <div className="py-8 flex flex-col items-center text-center space-y-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#bef264]/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-[#bef264] flex items-center justify-center text-black font-extrabold shadow-lg">
                  <Car size={32} className="animate-car-float" />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-200">
                Contacting verified {selectedRide.name} drivers around {pickupLocation}...
              </p>
              <p className="text-xs text-gray-500">Average response time: 20 seconds</p>
            </div>
          ) : bookingStep === "no_drivers" ? (
            <div className="py-8 flex flex-col items-center text-center space-y-4">
              <AlertCircle size={40} className="text-amber-400" />
              <p className="text-sm font-semibold text-gray-200">No drivers available right now</p>
              <p className="text-xs text-gray-500">Please try again in a few minutes.</p>
            </div>
          ) : (
            <>
              {/* OTP and Driver Header Card */}
              {driverInfo ? (
                <div className="bg-[#181d2a] border border-[#242b3d] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-[#1e2434] border border-gray-600 flex items-center justify-center">
                      <User size={22} className="text-gray-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white">{driverInfo.name}</h4>
                        <span className="text-[11px] bg-amber-400/20 text-amber-300 font-bold px-1.5 py-0.2 rounded">
                          {driverInfo.rating}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{driverInfo.vehicle}</p>
                    </div>
                  </div>
                  {/* Ride OTP */}
                  <div className="text-right pl-3 border-l border-gray-700/60">
                    <span className="block text-[10px] text-gray-400 uppercase font-semibold">Start OTP</span>
                    <span className="text-lg font-black text-[#bef264] tracking-widest">{driverInfo.otp}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#181d2a] border border-amber-500/20 rounded-2xl p-4 text-center">
                  <p className="text-xs text-amber-300 font-semibold">Ride requested — waiting for a driver to accept</p>
                  <p className="text-[11px] text-gray-500 mt-1">You will be notified when a driver accepts your ride.</p>
                </div>
              )}

              {/* Action buttons (Call / Message) */}
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#202738] hover:bg-[#283248] text-white text-xs font-semibold border border-gray-700/60 transition-colors">
                  <Phone size={15} className="text-[#bef264]" /> Call Driver
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#202738] hover:bg-[#283248] text-white text-xs font-semibold border border-gray-700/60 transition-colors">
                  <MessageSquare size={15} className="text-sky-400" /> Send Message
                </button>
              </div>

              {/* Route Summary */}
              <div className="bg-[#151924] border border-[#1f2534] rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] mt-1 shrink-0 ring-4 ring-[#22c55e]/20" />
                  <div>
                    <span className="block text-[11px] text-gray-400 font-medium">Pickup</span>
                    <span className="text-xs font-bold text-white">{pickupLocation}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] mt-1 shrink-0 ring-4 ring-[#ef4444]/20" />
                  <div>
                    <span className="block text-[11px] text-gray-400 font-medium">Drop-off</span>
                    <span className="text-xs font-bold text-white">{dropoffLocation}</span>
                  </div>
                </div>
              </div>

              {/* Fare & ETA summary */}
              <div className="flex items-center justify-between text-xs text-gray-300 px-1">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Clock size={14} /> Estimated Arrival: <strong className="text-white">3 mins</strong>
                </span>
                <span className="text-base font-extrabold text-[#bef264]">
                  Total Fare: ₹{selectedRide.estimatedPrice}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {bookingStep === "confirmed" && (
          <div className="p-4 border-t border-[#1c2230] bg-[#151924] flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs transition-colors border border-rose-500/20"
            >
              Cancel Ride
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#bef264] hover:bg-[#b0e84f] text-black font-extrabold text-xs transition-all shadow-md"
            >
              Track on Map
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
