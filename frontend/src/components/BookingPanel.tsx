"use client";

import React, { useState } from "react";
import {
  ArrowUpDown,
  X,
  Home,
  Briefcase,
  Plus,
  User,
  ChevronDown,
  ArrowRight,
  Check,
  CreditCard,
  Banknote,
  Smartphone,
  Navigation,
  Car,
} from "lucide-react";

export interface RideOption {
  id: string;
  name: string;
  capacity: number;
  description: string;
  eta: string;
  priceRange: string;
  estimatedPrice: number;
  color?: string; // accent color for the category icon
}

export const RIDE_OPTIONS: RideOption[] = [
  {
    id: "go",
    name: "RideX Go",
    capacity: 4,
    description: "Affordable, everyday rides",
    eta: "–",
    priceRange: "₹120–150",
    estimatedPrice: 130,
    color: "#38bdf8",
  },
  {
    id: "comfort",
    name: "RideX Comfort",
    capacity: 4,
    description: "More space, more comfort",
    eta: "–",
    priceRange: "₹180–220",
    estimatedPrice: 190,
    color: "#a78bfa",
  },
  {
    id: "xl",
    name: "RideX XL",
    capacity: 6,
    description: "For groups and extra luggage",
    eta: "–",
    priceRange: "₹250–320",
    estimatedPrice: 280,
    color: "#34d399",
  },
  {
    id: "black",
    name: "RideX Black",
    capacity: 4,
    description: "Premium experience",
    eta: "–",
    priceRange: "₹350–450",
    estimatedPrice: 390,
    color: "#fbbf24",
  },
];

interface BookingPanelProps {
  pickupLocation: string;
  setPickupLocation: (loc: string) => void;
  dropoffLocation: string;
  setDropoffLocation: (loc: string) => void;
  selectedRide: RideOption;
  setSelectedRide: (ride: RideOption) => void;
  onConfirmRide: () => void;
  onAddStop?: () => void;
  onSeeMore?: () => void;
  rideOptions?: RideOption[];
  onUseCurrentLocation?: () => void;
}

export const BookingPanel: React.FC<BookingPanelProps> = ({
  pickupLocation,
  setPickupLocation,
  dropoffLocation,
  setDropoffLocation,
  selectedRide,
  setSelectedRide,
  onConfirmRide,
  onAddStop,
  onSeeMore,
  rideOptions = RIDE_OPTIONS,
  onUseCurrentLocation,
}) => {
  const [selectedPayment, setSelectedPayment] = useState({
    type: "visa",
    label: "Visa  ••••  4242",
  });
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [homeSaved, setHomeSaved] = useState("Ramdaspeth, Nagpur");
  const [workSaved, setWorkSaved] = useState("MIHAN SEZ, Nagpur");

  // Swap pickup and drop-off
  const handleSwapLocations = () => {
    const temp = pickupLocation;
    setPickupLocation(dropoffLocation);
    setDropoffLocation(temp);
  };

  const paymentOptions = [
    { id: "visa", label: "Visa  ••••  4242", icon: CreditCard, brand: "VISA" },
    { id: "mastercard", label: "Mastercard  ••••  8891", icon: CreditCard, brand: "MC" },
    { id: "upi", label: "Google Pay / UPI (krish@okaxis)", icon: Smartphone, brand: "UPI" },
    { id: "cash", label: "Cash on delivery", icon: Banknote, brand: "CASH" },
  ];

  return (
    <aside className="w-full lg:w-[465px] lg:min-w-[465px] bg-[#0d0f14] border-l border-[#1a1d26] p-5 flex flex-col gap-4 overflow-y-auto z-20">
      {/* 1. Pickup and Drop-off Location Input Box */}
      <div className="bg-[#13151c] border border-[#1e222e] rounded-2xl p-4 relative">
        <div className="flex items-stretch gap-3">
          {/* Visual Route Indicator: Green dot -> Line -> Red dot */}
          <div className="flex flex-col items-center justify-between py-2 shrink-0">
            {/* Green circle */}
            <div className="w-3 h-3 rounded-full bg-[#22c55e] ring-4 ring-[#22c55e]/20" />
            {/* Vertical connector line */}
            <div className="w-0.5 flex-1 my-1.5 bg-gray-700/70" />
            {/* Red circle */}
            <div className="w-3 h-3 rounded-full bg-[#ef4444] ring-4 ring-[#ef4444]/20" />
          </div>

          {/* Location inputs */}
          <div className="flex-1 flex flex-col justify-between gap-3">
            {/* Pickup row */}
            <div className="flex items-center justify-between pr-8 border-b border-[#1f2430] pb-2.5">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-[11px] font-medium text-gray-400 leading-none">
                    Pickup location
                  </span>
                  {onUseCurrentLocation && (
                    <button
                      type="button"
                      onClick={onUseCurrentLocation}
                      className="text-[10px] text-[#38bdf8] hover:text-[#7dd3fc] font-semibold flex items-center gap-1 transition-colors"
                      title="Set to your real current GPS location"
                    >
                      <Navigation size={10} className="fill-[#38bdf8]" />
                      <span>Current Location</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="Enter pickup location"
                  className="bg-transparent text-sm font-semibold text-white placeholder-gray-500 outline-none w-full"
                />
              </div>
              {pickupLocation && (
                <button
                  onClick={() => setPickupLocation("")}
                  className="text-gray-500 hover:text-gray-300 p-1"
                  aria-label="Clear pickup"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Drop-off row */}
            <div className="flex items-center justify-between pr-8 pt-0.5">
              <div className="flex-1">
                <span className="block text-[11px] font-medium text-gray-400 leading-none mb-1">
                  Drop-off location
                </span>
                <input
                  type="text"
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                  placeholder="Enter destination"
                  className="bg-transparent text-sm font-semibold text-white placeholder-gray-500 outline-none w-full"
                />
              </div>
              {dropoffLocation && (
                <button
                  onClick={() => setDropoffLocation("")}
                  className="text-gray-500 hover:text-gray-300 p-1"
                  aria-label="Clear drop-off"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Swap Locations Button */}
          <button
            onClick={handleSwapLocations}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1b1f2b] hover:bg-[#252b3d] border border-[#2b3345] text-gray-300 hover:text-white flex items-center justify-center transition-all active:rotate-180 shadow-md"
            title="Swap locations"
            aria-label="Swap pickup and drop-off"
          >
            <ArrowUpDown size={15} />
          </button>
        </div>
      </div>

      {/* 2. Quick Shortcuts: Home, Work, Add Stop */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Home */}
        <button
          onClick={() => setDropoffLocation(homeSaved)}
          className="bg-[#13151c] hover:bg-[#181b24] border border-[#1e222e] hover:border-gray-700 rounded-2xl p-2.5 flex items-center gap-2.5 transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#1b1f2b] flex items-center justify-center text-gray-300 group-hover:text-white shrink-0">
            <Home size={16} />
          </div>
          <div className="truncate">
            <span className="block text-xs font-bold text-white group-hover:text-[#bef264] transition-colors leading-tight">
              Home
            </span>
            <span className="block text-[10px] text-gray-400 leading-tight">Add</span>
          </div>
        </button>

        {/* Work */}
        <button
          onClick={() => setDropoffLocation(workSaved)}
          className="bg-[#13151c] hover:bg-[#181b24] border border-[#1e222e] hover:border-gray-700 rounded-2xl p-2.5 flex items-center gap-2.5 transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#1b1f2b] flex items-center justify-center text-gray-300 group-hover:text-white shrink-0">
            <Briefcase size={16} />
          </div>
          <div className="truncate">
            <span className="block text-xs font-bold text-white group-hover:text-[#bef264] transition-colors leading-tight">
              Work
            </span>
            <span className="block text-[10px] text-gray-400 leading-tight">Add</span>
          </div>
        </button>

        {/* Add Stop */}
        <button
          onClick={onAddStop}
          className="bg-[#13151c] hover:bg-[#181b24] border border-[#1e222e] hover:border-gray-700 rounded-2xl p-2.5 flex items-center gap-2.5 transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#1b1f2b] flex items-center justify-center text-gray-300 group-hover:text-white shrink-0">
            <Plus size={16} />
          </div>
          <div className="truncate">
            <span className="block text-xs font-bold text-white group-hover:text-[#bef264] transition-colors leading-tight">
              Add Stop
            </span>
            <span className="block text-[10px] text-gray-400 leading-tight">+</span>
          </div>
        </button>
      </div>

      {/* 3. "Choose a ride" Heading and Ride Options */}
      <div className="flex flex-col gap-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-bold text-white tracking-tight">Choose a ride</h3>
          <button
            onClick={onSeeMore}
            className="text-xs font-semibold text-[#38bdf8] hover:text-[#7dd3fc] transition-colors"
          >
            See more
          </button>
        </div>

        {/* Ride Option Cards */}
        <div className="flex flex-col gap-2.5">
          {rideOptions.map((ride) => {
            const isSelected = selectedRide.id === ride.id;

            return (
              <div
                key={ride.id}
                onClick={() => setSelectedRide(ride)}
                className={`group relative rounded-2xl p-3 flex items-center gap-3.5 cursor-pointer transition-all duration-150 border ${
                  isSelected
                    ? "bg-[#161c28] border-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                    : "bg-[#13151c] border-[#1e222e] hover:border-gray-700 hover:bg-[#171a24]"
                }`}
              >
                {/* Vehicle Icon */}
                <div
                  className="w-[84px] h-[52px] relative shrink-0 flex items-center justify-center rounded-xl"
                  style={{ background: `${ride.color ?? "#38bdf8"}12`, border: `1px solid ${ride.color ?? "#38bdf8"}30` }}
                >
                  <Car
                    size={36}
                    strokeWidth={1.4}
                    style={{ color: ride.color ?? "#38bdf8" }}
                    className="drop-shadow group-hover:scale-110 transition-transform duration-300"
                  />
                </div>

                {/* Ride Details (Center) */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {ride.name}
                    </h4>
                    <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 font-medium">
                      <User size={12} className="text-gray-400" />
                      <span>{ride.capacity}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate leading-snug">
                    {ride.description}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5 leading-snug">
                    {ride.eta}
                  </p>
                </div>

                {/* Price (Right) */}
                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-white tracking-tight">
                    {ride.priceRange}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Payment Method Selector */}
      <div className="relative pt-1">
        <button
          onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
          className="w-full bg-[#13151c] hover:bg-[#171a24] border border-[#1e222e] hover:border-gray-700 rounded-2xl p-3 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            {/* Visa Badge */}
            <div className="bg-[#1b2746] text-[#4f80ff] border border-[#2b3d6f] px-2 py-0.5 rounded text-[11px] font-black tracking-wider">
              VISA
            </div>
            <span className="text-sm font-semibold text-gray-200">
              {selectedPayment.label}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${
              showPaymentDropdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Payment Dropdown Menu */}
        {showPaymentDropdown && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#141722] border border-[#232838] rounded-2xl shadow-2xl p-2 z-50">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Select Payment Method
            </div>
            {paymentOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSelectedPayment({ type: opt.id, label: opt.label });
                  setShowPaymentDropdown(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#1e2332] text-xs font-medium text-gray-200 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="bg-[#1a2234] text-xs font-bold text-gray-300 px-2 py-0.5 rounded border border-[#283248]">
                    {opt.brand}
                  </span>
                  <span>{opt.label}</span>
                </div>
                {selectedPayment.type === opt.id && (
                  <Check size={15} className="text-[#bef264]" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. Large Lime-Green Confirm Ride Button */}
      <button
        onClick={onConfirmRide}
        className="w-full bg-[#bef264] hover:bg-[#b0e84f] text-[#0d0f14] font-black py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-[#bef264]/15 hover:shadow-[#bef264]/25 transition-all duration-200 active:scale-[0.99] cursor-pointer mt-1"
      >
        <span className="text-base font-extrabold tracking-tight">Confirm Ride</span>
        <div className="flex items-center gap-2 text-base font-extrabold">
          <span>₹{selectedRide.estimatedPrice}</span>
          <ArrowRight size={20} strokeWidth={2.6} />
        </div>
      </button>
    </aside>
  );
};
