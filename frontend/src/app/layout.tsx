import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RideX — Fast & Reliable Cab Booking",
  description: "Book rides anywhere in Nagpur with RideX. Safe, fast, and affordable.",
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="bg-[#090a0f] text-gray-100 antialiased overflow-x-hidden selection:bg-[#b4f74d] selection:text-black">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
