"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg("Email dan password wajib diisi!");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign In ke Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        setErrorMsg(
          error.message.includes("Invalid login credentials")
            ? "Email atau password salah!"
            : error.message
        );
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMsg("Pengguna tidak ditemukan!");
        setLoading(false);
        return;
      }

      // 2. Cek apakah user ini terdaftar sebagai STAFF di tabel 'profiles'
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", data.user.id)
        .maybeSingle();

      // Jika tidak ada di tabel profiles atau rolenya bukan staff internal
      if (profileError || !profile || !["OWNER", "ADMIN", "SENIOR_GRADER", "OPERATOR"].includes(profile.role)) {
        await supabase.auth.signOut(); // Paksa logout sesi auth
        setErrorMsg("Akses ditolak! Akun ini bukan akun Staff Internal Lab.");
        setLoading(false);
        return;
      }

      // 3. Masuk ke Dashboard Admin
      router.replace("/admin/dashboard");
    } catch (err: any) {
      console.error("Login Error:", err);
      setErrorMsg("Terjadi kesalahan sistem.");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto w-full bg-gray-800 grid grid-cols-1 lg:grid-cols-12">
      <div className="hidden md:flex"></div>
      <div className="hidden lg:flex flex-col lg:col-span-6 justify-center lg:justify-between text-white min-h-[35vh] lg:min-h-screen">
        <div className="my-auto space-y-4 lg:space-y-6 max-w-xl px-10">
          <div className="space-y-2 lg:space-y-4">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-tight">
              Staff Portal ICS
            </h1>
            <p className="text-indigo-100 text-sm lg:text-lg font-light leading-relaxed">
              Masuk khusus untuk Tim Internal Lab, Grader, dan Administrator POS ICS.
            </p>
          </div>
        </div>
      </div>

      <div className="w-[90%] sm:w-[85%] max-w-[400px] lg:max-w-none lg:w-full mx-auto self-center lg:self-end my-auto lg:my-0 lg:mt-auto lg:col-span-5 xl:col-span-4 bg-white dark:bg-gray-900 h-auto lg:h-[90vh] flex flex-col justify-center p-6 sm:p-10 lg:p-16 shadow-2xl rounded-[2rem]">
        <div className="w-full mx-auto space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Admin Sign In
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Khusus akses pegawai internal lab.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600 text-sm border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 text-center font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <Label className="mb-2 block font-semibold text-gray-700 dark:text-gray-300 text-xs">Email Staff</Label>
              <input
                type="email"
                placeholder="staff@ics.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-full border border-gray-200 bg-gray-50/50 px-5 py-3.5 text-sm text-gray-800 outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <Label className="mb-2 block font-semibold text-gray-700 dark:text-gray-300 text-xs">Password</Label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-full border border-gray-200 bg-gray-50/50 px-5 py-3.5 text-sm text-gray-800 outline-none focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <Button
              className="w-full rounded-full py-3.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg cursor-pointer"
              size="sm"
              disabled={loading}
            >
              {loading ? "Memverifikasi Staff..." : "Sign In Admin"}
            </Button>
          </form>
        </div>
      </div>
      <div className="hidden md:flex"></div>
    </div>
  );
}