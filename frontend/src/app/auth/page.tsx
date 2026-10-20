"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Phone,
  Car,
  Compass,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AuthPage() {
  const router = useRouter();
  const { user, isLoading, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"rider" | "customer">("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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
          router.replace("/");
        }
      } else {
        const { data, error } = await signUpWithEmail(email, password, fullName, role, mobileNumber);
        if (error) {
          setErrorMsg(error.message);
        } else if (data?.session) {
          router.replace("/");
        } else {
          setSuccessMsg(
            role === "rider"
              ? "Rider account created! You can now sign in to access the Rider Dashboard."
              : "Account created! You can now sign in to book rides."
          );
          setMode("signin");
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#bef264] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] flex overflow-hidden">
      {/* ── Left Panel — Branding ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden bg-[#0c0e16]">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0e1520] via-[#0c0e16] to-[#090a0f]" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#bef264]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-[#38bdf8]/5 rounded-full blur-3xl" />

        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#bef264 1px, transparent 1px), linear-gradient(90deg, #bef264 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#bef264] rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-black" fill="black" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              Ride<span className="text-[#bef264]">X</span>
            </span>
          </div>

          {/* Main Hero */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-6">
              <span className="text-xs font-bold text-[#bef264] uppercase tracking-widest bg-[#bef264]/10 border border-[#bef264]/20 px-3 py-1 rounded-full">
                Nagpur's #1 Cab Platform
              </span>
            </div>
            <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
              Move smarter,
              <br />
              <span className="text-[#bef264]">arrive faster.</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              Real-time cab booking, live tracking, and transparent fares —
              built for Nagpur's roads and its people.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 mt-8">
              {["Safe Rides", "Live Tracking", "Best Fares", "Riders Earn More"].map((f) => (
                <span
                  key={f}
                  className="text-xs font-semibold text-gray-300 bg-[#13161f] border border-[#232838] px-3 py-1.5 rounded-full"
                >
                  ✓ {f}
                </span>
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[#1a1f2e]">
            {[
              { val: "50K+", label: "Rides Completed" },
              { val: "4.9★", label: "Average Rating" },
              { val: "2 Min", label: "Avg. Pickup Time" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-black text-[#bef264]">{s.val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel — Auth Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-[#bef264] rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-black" fill="black" />
          </div>
          <span className="text-xl font-black text-white">
            Ride<span className="text-[#bef264]">X</span>
          </span>
        </div>

        <div className="w-full max-w-[420px]">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-gray-400 text-sm mt-1.5">
              {mode === "signin"
                ? "Sign in to your RideX account to continue."
                : "Join thousands of riders and customers on RideX."}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex p-1 bg-[#10131b] border border-[#1e2232] rounded-2xl mb-6">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  mode === m
                    ? "bg-[#bef264] text-black shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selector — Sign Up only */}
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">
                  I want to register as
                </label>
                <div className="grid grid-cols-2 gap-2.5 p-1 bg-[#0f121a] rounded-2xl border border-[#1e2232]">
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                      role === "customer"
                        ? "bg-[#1c2235] text-white shadow border border-[#3b82f6]/40"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Compass size={15} className={role === "customer" ? "text-[#38bdf8]" : "text-gray-600"} />
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("rider")}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                      role === "rider"
                        ? "bg-[#1c2235] text-white shadow border border-[#bef264]/40"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Car size={15} className={role === "rider" ? "text-[#bef264]" : "text-gray-600"} />
                    Rider / Driver
                  </button>
                </div>
              </div>
            )}

            {/* Alerts */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck size={14} className="shrink-0" />
                {successMsg}
              </div>
            )}

            {/* Full Name */}
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Full Name</label>
                <div className="flex items-center gap-3 bg-[#0f121a] border border-[#1e2232] focus-within:border-[#bef264]/60 rounded-xl px-3.5 py-3 transition-colors">
                  <User size={15} className="text-gray-500 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder={role === "rider" ? "Rajesh Sharma" : "Krish Bangade"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-transparent text-sm text-white placeholder-gray-600 outline-none w-full"
                  />
                </div>
              </div>
            )}

            {/* Mobile — Rider only */}
            {mode === "signup" && role === "rider" && (
              <div>
                <label className="block text-xs font-semibold text-[#bef264] mb-1.5">
                  Mobile Number <span className="text-gray-500 font-normal">(required for riders)</span>
                </label>
                <div className="flex items-center gap-3 bg-[#0f121a] border border-[#bef264]/30 focus-within:border-[#bef264]/60 rounded-xl px-3.5 py-3 transition-colors">
                  <Phone size={15} className="text-[#bef264] shrink-0" />
                  <span className="text-xs font-bold text-gray-500 border-r border-gray-700 pr-3">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98765 43210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                    className="bg-transparent text-sm text-white placeholder-gray-600 outline-none w-full font-mono"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email Address</label>
              <div className="flex items-center gap-3 bg-[#0f121a] border border-[#1e2232] focus-within:border-[#bef264]/60 rounded-xl px-3.5 py-3 transition-colors">
                <Mail size={15} className="text-gray-500 shrink-0" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent text-sm text-white placeholder-gray-600 outline-none w-full"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Password</label>
              <div className="flex items-center gap-3 bg-[#0f121a] border border-[#1e2232] focus-within:border-[#bef264]/60 rounded-xl px-3.5 py-3 transition-colors">
                <Lock size={15} className="text-gray-500 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent text-sm text-white placeholder-gray-600 outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-500 hover:text-gray-300 shrink-0"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#bef264] hover:bg-[#b0e84f] disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-[#bef264]/15 mt-2 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>
                  <span>
                    {mode === "signin"
                      ? "Sign In to RideX"
                      : role === "rider"
                      ? "Register as Rider"
                      : "Create Customer Account"}
                  </span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-500 mt-6">
            By continuing, you agree to RideX's{" "}
            <span className="text-[#bef264] cursor-pointer hover:underline">Terms of Service</span>{" "}
            and{" "}
            <span className="text-[#bef264] cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
