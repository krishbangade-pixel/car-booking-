"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Phone,
  Car,
  Compass,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
  initialRole?: "rider" | "customer";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = "signin",
  initialRole = "customer",
}) => {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [role, setRole] = useState<"rider" | "customer">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { signInWithEmail, signUpWithEmail } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation for rider mobile number
    if (mode === "signup" && role === "rider") {
      if (!mobileNumber.trim()) {
        setErrorMsg("Mobile number is required for Rider account registration.");
        return;
      }
      if (mobileNumber.trim().replace(/\D/g, "").length < 10) {
        setErrorMsg("Please enter a valid 10-digit mobile number.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          onClose();
        }
      } else {
        const { data, error } = await signUpWithEmail(
          email,
          password,
          fullName,
          role,
          mobileNumber
        );
        if (error) {
          setErrorMsg(error.message);
        } else if (data?.session) {
          // Registration automatically established session -> close modal immediately
          onClose();
        } else {
          setSuccessMsg(
            role === "rider"
              ? "Rider account created! You can now sign in to access the Rider Dashboard."
              : "Customer account created! You can now sign in to book rides."
          );
          setMode("signin");
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Authentication failed. Please check your credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#12151e] border border-[#232938] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-left">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-[#1a2233] to-[#12151e] border-b border-[#232938] relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1e2434] hover:bg-[#283046] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl font-black text-white">
              Ride<span className="text-[#bef264]">X</span>
            </span>
            <span className="text-xs bg-[#bef264]/10 text-[#bef264] border border-[#bef264]/30 font-bold px-2 py-0.5 rounded-full">
              {role === "rider" ? "Rider / Driver Portal" : "Customer Portal"}
            </span>
          </div>

          <h3 className="text-xl font-extrabold text-white tracking-tight">
            {mode === "signin"
              ? "Welcome back"
              : role === "rider"
              ? "Register as RideX Rider"
              : "Create Customer Account"}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {mode === "signin"
              ? "Sign in to access your dashboard and ride services."
              : role === "rider"
              ? "Accept ride requests, track earnings & navigate Nagpur city."
              : "Fast, reliable cab booking and real-time tracking across Nagpur."}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Account Role Selector (Rider vs Customer) - Only on Sign Up */}
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                I want to register as
              </label>
              <div className="grid grid-cols-2 gap-2.5 p-1 bg-[#0f121a] rounded-2xl border border-[#202636]">
                <button
                  type="button"
                  onClick={() => setRole("customer")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    role === "customer"
                      ? "bg-[#1f2638] text-white shadow-md border border-[#3b82f6]/40"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Compass size={15} className={role === "customer" ? "text-[#38bdf8]" : "text-gray-500"} />
                  <span>Customer (Passenger)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("rider")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    role === "rider"
                      ? "bg-[#1f2638] text-white shadow-md border border-[#bef264]/50"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Car size={15} className={role === "rider" ? "text-[#bef264]" : "text-gray-500"} />
                  <span>Rider (Driver)</span>
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <ShieldCheck size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Full Name
              </label>
              <div className="flex items-center gap-2.5 bg-[#171b26] border border-[#232838] focus-within:border-[#bef264] rounded-xl px-3.5 py-2.5 transition-colors">
                <User size={16} className="text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder={role === "rider" ? "Rajesh Sharma (Rider)" : "Krish Bangade"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"
                />
              </div>
            </div>
          )}

          {/* Mobile Number Field - Mandatory for Rider on Sign Up */}
          {mode === "signup" && role === "rider" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#bef264]">
                  Mobile Number (Required for Rider)
                </label>
                <span className="text-[10px] text-gray-400">OTP & Dispatch</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#171b26] border border-[#bef264]/40 focus-within:border-[#bef264] rounded-xl px-3.5 py-2.5 transition-colors">
                <Phone size={16} className="text-[#bef264]" />
                <span className="text-xs font-bold text-gray-400 border-r border-gray-700 pr-2">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="98765 43210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                  className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Email Address
            </label>
            <div className="flex items-center gap-2.5 bg-[#171b26] border border-[#232838] focus-within:border-[#bef264] rounded-xl px-3.5 py-2.5 transition-colors">
              <Mail size={16} className="text-gray-400" />
              <input
                type="email"
                required
                placeholder={role === "rider" ? "rider@ridex.nagpur" : "krish@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Password
            </label>
            <div className="flex items-center gap-2.5 bg-[#171b26] border border-[#232838] focus-within:border-[#bef264] rounded-xl px-3.5 py-2.5 transition-colors">
              <Lock size={16} className="text-gray-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#bef264] hover:bg-[#b0e84f] disabled:opacity-50 text-black font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-[#bef264]/15 mt-2 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>
                  {mode === "signin"
                    ? "Sign In"
                    : role === "rider"
                    ? "Register as Rider"
                    : "Create Customer Account"}
                </span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </>
            )}
          </button>

          {/* Toggle Signin / Signup */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setErrorMsg(null);
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <strong className="text-[#bef264]">Sign up (Rider / Customer)</strong>
                </>
              ) : (
                <>
                  Already have an account? <strong className="text-[#bef264]">Sign in</strong>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
