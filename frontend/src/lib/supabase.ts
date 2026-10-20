import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zepaedygqehfeawczlul.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcGFlZHlncWVoZmVhd2N6bHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTY1MzMsImV4cCI6MjEwNzM3MjUzM30.etGqoahRysGUsaOQBg0Hw1yfRq8pH0JZ2n4ERPyecBM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
