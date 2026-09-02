"use client";

import React, { useState, useEffect } from "react";
import { LogIn, LogOut, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export default function StaffAttendanceWidget() {
  const [userName, setUserName] = useState("Pegawai");
  const [userId, setUserId] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [todayAttendanceId, setTodayAttendanceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTodayAttendance = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserId(session.user.id);
        
        // Fetch Profile Name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single();
        if (profile?.full_name) setUserName(profile.full_name);

        // Fetch Hari ini
        const todayStr = new Date().toISOString().split("T")[0];
        const { data: attendance } = await supabase
          .from("attendances")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("date", todayStr)
          .single();

        if (attendance) {
          setTodayAttendanceId(attendance.id);
          if (attendance.clock_in) {
            setClockInTime(
              new Date(attendance.clock_in).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              }) + " WIB"
            );
          }
          if (attendance.clock_out) {
            setClockOutTime(
              new Date(attendance.clock_out).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              }) + " WIB"
            );
          }
        }
      }
      setLoading(false);
    };

    fetchTodayAttendance();
  }, []);

  const handleClockIn = async () => {
    if (!userId) return;
    setSubmitting(true);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    
    // Tentukan status Terlambat jika masuk > jam 08:15
    const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 15);
    const status = isLate ? "Terlambat" : "Hadir";

    const payload = {
      user_id: userId,
      date: todayStr,
      clock_in: now.toISOString(),
      status: status,
    };

    const { data, error } = await supabase.from("attendances").insert([payload]).select().single();
    setSubmitting(false);

    if (error) {
      Swal.fire("Error", "Gagal absen masuk: " + error.message, "error");
    } else {
      Swal.fire("Berhasil", "Absen masuk berhasil dicatat!", "success");
      setTodayAttendanceId(data.id);
      setClockInTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB");
    }
  };

  const handleClockOut = async () => {
    if (!todayAttendanceId) return;
    setSubmitting(true);

    const now = new Date();
    const payload = {
      clock_out: now.toISOString(),
    };

    const { error } = await supabase.from("attendances").update(payload).eq("id", todayAttendanceId);
    setSubmitting(false);

    if (error) {
      Swal.fire("Error", "Gagal absen pulang: " + error.message, "error");
    } else {
      Swal.fire("Berhasil", "Absen pulang berhasil. Selamat beristirahat!", "success");
      setClockOutTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB");
    }
  };

  return (
    <div className="w-full p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-6">
      {/* Header Presensi */}
      <div className="flex items-center justify-between border-b pb-4 dark:border-gray-800">
        <div>
          <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
            Presensi Staff
          </span>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            Halo, {userName} 👋
          </h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
          </p>
          <div className="flex items-center justify-end gap-1 text-sm font-bold text-gray-700 dark:text-gray-200 mt-0.5">
            <Clock className="w-4 h-4 text-brand-500" />
            <span>08:00 WIB</span>
          </div>
        </div>
      </div>

      {/* Status Card Harian */}
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
        {loading ? (
          <p className="text-xs text-gray-400">Memeriksa status absensi...</p>
        ) : clockInTime ? (
          <>
            <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Status Hari Ini</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white">
                Sudah Absen Masuk ({clockInTime})
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-7 h-7 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Status Hari Ini</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white">
                Belum Absen Masuk
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tombol Utama Akses Presensi */}
      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={!!clockInTime || submitting || loading}
          onClick={handleClockIn}
          className="flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
        >
          <LogIn className="w-6 h-6 mb-1" />
          <span className="text-xs">ABSEN MASUK</span>
          <span className="text-[10px] opacity-80 mt-0.5">{clockInTime || "--:--"}</span>
        </button>

        <button
          disabled={!clockInTime || !!clockOutTime || submitting || loading}
          onClick={handleClockOut}
          className="flex flex-col items-center justify-center p-4 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
        >
          <LogOut className="w-6 h-6 mb-1" />
          <span className="text-xs">ABSEN PULANG</span>
          <span className="text-[10px] opacity-80 mt-0.5">{clockOutTime || "--:--"}</span>
        </button>
      </div>

      {/* Riwayat Shift Ringkas */}
      <div className="text-xs space-y-2 pt-2 border-t dark:border-gray-800">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Jam Shift Standar:</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">08:00 - 17:00 WIB</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Status Pulang:</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {clockOutTime ? `Selesai (${clockOutTime})` : "Sedang Bekerja"}
          </span>
        </div>
      </div>
    </div>
  );
}