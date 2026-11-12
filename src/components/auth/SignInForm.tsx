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

      // 2. Ambil data profil pengguna dari Supabase
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_profile_completed, full_name, whatsapp_no")
        .eq("id", data.user.id)
        .single();

      // 3. Logika Alur Navigasi Pintar
      if (profileError || !profile) {
        // Jika belum ada row profile, arahkan ke onboarding
        router.replace("/onboarding");
        return;
      }

      // A. Jika Staff Internal (OWNER, ADMIN, SENIOR_GRADER, OPERATOR)
      if (["OWNER", "ADMIN", "SENIOR_GRADER", "OPERATOR"].includes(profile.role)) {
        router.replace("/admin/dashboard");
      }
      // B. Jika User Biasa / Kolektor
      else {
        if (!profile.is_profile_completed || !profile.full_name || !profile.whatsapp_no) {
          router.replace("/onboarding");
        } else {
          router.replace("/"); // atau /vault
        }
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setErrorMsg("Terjadi kesalahan sistem.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto w-full bg-gray-800 grid grid-cols-1 lg:grid-cols-12">
      {/* SISI KIRI: BRANDING */}
      <div className="hidden md:flex"></div>
      <div className="hidden lg:flex flex-col lg:col-span-6 justify-center lg:justify-between text-white min-h-[35vh] lg:min-h-screen">
        <div className="my-auto space-y-4 lg:space-y-6 max-w-xl">
          <div className="space-y-2 lg:space-y-4">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-tight">
              Hey, Hello!
            </h1>
            <p className="text-indigo-100 text-sm lg:text-lg font-light leading-relaxed">
              Selamat datang di Dashboard POS &amp; Management ICS. Kelola pesanan, stok material, dan kas keuangan toko dalam satu pintu.
            </p>
          </div>
        </div>

        <div className="text-xs text-indigo-200 pt-6 hidden lg:block">
          &copy; {new Date().getFullYear()} ICS Management System. All rights reserved.
        </div>
      </div>

      {/* SISI KANAN: CARD FORM PUTIH */}
      <div className="w-[90%] sm:w-[85%] max-w-[400px] lg:max-w-none lg:w-full mx-auto self-center lg:self-end my-auto lg:my-0 lg:mt-auto lg:col-span-5 xl:col-span-4 bg-white dark:bg-gray-900 h-auto lg:h-[90vh] flex flex-col justify-center p-6 sm:p-10 lg:p-16 shadow-2xl rounded-[2rem] lg:rounded-none lg:rounded-t-[2.5rem] lg:rounded-b-none">
        <div className="flex items-center justify-center gap-2 lg:gap-3 mb-3 lg:mb-8">
          <Image
            src="/images/logo/ics-logo2.png"
            alt="Logo ICS"
            width={60}
            height={60}
            className="dark:h-36 h-20 lg:h-30 w-auto object-contain dark:bg-white dark:border-md dark:rounded-md dark:p-3"
          />
        </div>

        <div className="w-full mx-auto space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Sign In
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Masukkan email dan password Anda untuk masuk!
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600 text-sm border border-rose-200 dark:bg-rose-500/10 dark:border-rose-800 dark:text-rose-400 text-center font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <Label className="mb-2 block font-semibold text-gray-700 dark:text-gray-300 text-xs tracking-wider">
                Email <span className="text-rose-500">*</span>
              </Label>
              <input
                type="email"
                placeholder="email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-full border border-gray-200 bg-gray-50/50 px-5 py-3.5 text-sm text-gray-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-800 dark:bg-gray-800/50 dark:text-white dark:focus:border-indigo-400"
              />
            </div>

            <div>
              <Label className="mb-2 block font-semibold text-gray-700 dark:text-gray-300 text-xs tracking-wider">
                Password <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-full border border-gray-200 bg-gray-50/50 px-5 py-3.5 text-sm text-gray-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-800 dark:bg-gray-800/50 dark:text-white dark:focus:border-indigo-400 pr-12"
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-10 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? (
                    <EyeIcon className="w-5 h-5 fill-current" />
                  ) : (
                    <EyeCloseIcon className="w-5 h-5 fill-current" />
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <Checkbox checked={isChecked} onChange={setIsChecked} />
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Ingat saya
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                className="w-full rounded-full py-3.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                size="sm"
                disabled={loading}
              >
                {loading ? "Memproses Masuk..." : "Sign in"}
              </Button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-gray-700 dark:text-gray-400">
              Belum memiliki akun?{" "}
              <Link
                href="/signup"
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold"
              >
                Daftar Sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="hidden md:flex"></div>
    </div>
  );
}