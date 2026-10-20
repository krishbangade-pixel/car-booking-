"use client";

import React from "react";
import { X, Crown, Check, Zap, Sparkles, ShieldCheck } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12151e] border border-[#232938] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-left">
        {/* Glow Header */}
        <div className="relative p-6 bg-gradient-to-br from-amber-500/20 via-[#181d28] to-[#12151e] border-b border-[#232938]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1e2434] hover:bg-[#283046] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
            <Crown size={24} className="fill-amber-400" />
          </div>

          <h3 className="text-xl font-extrabold text-white tracking-tight">RideX Premium Pass</h3>
          <p className="text-xs text-gray-300 mt-1">
            Unlock the ultimate cab booking experience across Nagpur.
          </p>
        </div>

        {/* Benefits List */}
        <div className="p-6 space-y-3.5">
          {[
            {
              title: "Zero Surge Pricing",
              desc: "Never pay surge during peak Nagpur rush hours.",
            },
            {
              title: "Priority Driver Matching",
              desc: "Get assigned the top-rated 4.9★+ drivers within 60 seconds.",
            },
            {
              title: "Free Airport & Station Cancellation",
              desc: "Zero penalties up to 10 minutes before arrival.",
            },
            {
              title: "Complimentary Comfort Upgrades",
              desc: "Automatic free upgrade to RideX Comfort when available.",
            },
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#bef264]/20 border border-[#bef264]/50 flex items-center justify-center text-[#bef264] mt-0.5 shrink-0">
                <Check size={12} strokeWidth={3} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{item.title}</p>
                <p className="text-[11px] text-gray-400 leading-snug">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Plan & CTA */}
        <div className="p-5 border-t border-[#1c2230] bg-[#151924] flex items-center justify-between gap-4">
          <div>
            <span className="block text-[10px] text-gray-400 uppercase font-bold">Monthly Plan</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">₹299</span>
              <span className="text-xs text-gray-400">/mo</span>
            </div>
          </div>
          <button
            onClick={() => {
              alert("Congratulations! RideX Premium activated.");
              onClose();
            }}
            className="py-3 px-6 rounded-xl bg-[#bef264] hover:bg-[#b0e84f] text-black font-extrabold text-xs transition-all shadow-md active:scale-95"
          >
            Activate Premium
          </button>
        </div>
      </div>
    </div>
  );
};
