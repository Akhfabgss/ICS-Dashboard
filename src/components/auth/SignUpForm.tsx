"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isChecked) {
      setErrorMsg("Anda harus menyetujui Syarat dan Ketentuan.");
      return;
    }

    const cleanEmail = email.trim();
    const fullName = `${firstName} ${lastName}`.trim();

    if (!cleanEmail || !password || !firstName) {
      setErrorMsg("Mohon lengkapi semua bidang wajib.");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign Up ke Supabase Auth dengan User Metadata
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: fullName,
            username: cleanEmail.split("@")[0],
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      // 2. Langsung arahkan ke halaman onboarding untuk pengisian nomor WA & alamat
      if (data.user) {
        router.replace("/onboarding");
      }
    } catch (err: any) {
      console.error("SignUp Error:", err);
      setErrorMsg("Terjadi kesalahan saat pendaftaran akun.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Kembali ke Beranda
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto pb-10">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Sign Up
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Daftarkan email dan password Anda untuk membuat akun ICS!
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 text-rose-600 text-sm border border-rose-200 dark:bg-rose-500/10 dark:border-rose-800 dark:text-rose-400 text-center font-medium">
            {errorMsg}
          </div>
        )}

        <div>
          <form onSubmit={handleSignUp}>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Nama Depan */}
                <div className="sm:col-span-1">
                  <Label>
                    Nama Depan<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="fname"
                    name="fname"
                    placeholder="Contoh: Bagas"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                {/* Nama Belakang */}
                <div className="sm:col-span-1">
                  <Label>Nama Belakang</Label>
                  <Input
                    type="text"
                    id="lname"
                    name="lname"
                    placeholder="Contoh: Pratama"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label>
                  Email<span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="email@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <Label>
                  Password<span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Masukkan password Anda"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
              </div>

              {/* Checkbox Syarat & Ketentuan */}
              <div className="flex items-center gap-3">
                <Checkbox
                  className="w-5 h-5"
                  checked={isChecked}
                  onChange={setIsChecked}
                />
                <p className="inline-block font-normal text-xs text-gray-500 dark:text-gray-400">
                  Dengan membuat akun, Anda menyetujui{" "}
                  <span className="text-gray-800 font-semibold dark:text-white/90">
                    Syarat &amp; Ketentuan
                  </span>{" "}
                  serta{" "}
                  <span className="text-gray-800 font-semibold dark:text-white">
                    Kebijakan Privasi
                  </span>{" "}
                  ICS.
                </p>
              </div>

              {/* Tombol Register */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Mendaftarkan Akun..." : "Sign Up"}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              Sudah memiliki akun?{" "}
              <Link
                href="/signin"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400 font-semibold"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}