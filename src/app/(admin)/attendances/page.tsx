"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import RoleGuard from "@/components/auth/RoleGuard";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Users, AlertTriangle, Clock } from "lucide-react";
import { CalenderIcon } from "@/icons"; // Menggunakan CalenderIcon sesuai proyek kamu

interface AttendanceRecord {
    id: string;
    user_id: string;
    employee_name: string;
    role: string;
    date: string;
    rawDate: Date;
    clock_in: string | null;
    clock_out: string | null;
    status: "Hadir" | "Terlambat" | "Izin" | "Alpha";
    durationStr: string;
}

export default function AttendancesPage() {
    return (
        <RoleGuard allowedRoles={["Owner", "Bendahara"]}>
            <AttendanceContent />
        </RoleGuard>
    );
}

function AttendanceContent() {
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [selectedStatus, setSelectedStatus] = useState<string>("Semua");

    const datePickerRef = useRef<HTMLInputElement | null>(null);
    const fpInstance = useRef<flatpickr.Instance | null>(null);

    useEffect(() => {
        if (datePickerRef.current) {
            fpInstance.current = flatpickr(datePickerRef.current, {
                mode: "range",
                dateFormat: "Y-m-d",
                onChange: (selectedDates) => {
                    if (selectedDates.length === 2) {
                        setDateRange([selectedDates[0], selectedDates[1]]);
                    } else if (selectedDates.length === 0) {
                        setDateRange([null, null]);
                    }
                },
            });
        }

        return () => {
            if (fpInstance.current) fpInstance.current.destroy();
        };
    }, []);

    // Handler Reset Filter Tanggal
    const handleResetDate = () => {
        if (fpInstance.current) {
            fpInstance.current.clear();
        }
        setDateRange([null, null]);
    };

    const fetchAttendances = async () => {
        setLoading(true);

        const { data: attData } = await supabase
            .from("attendances")
            .select("id, user_id, date, clock_in, clock_out, status, profiles(full_name, role)")
            .order("date", { ascending: false });

        if (attData) {
            const list: AttendanceRecord[] = attData.map((item: any) => {
                let durationStr = "-";
                if (item.clock_in && item.clock_out) {
                    const start = new Date(item.clock_in).getTime();
                    const end = new Date(item.clock_out).getTime();
                    const diffMs = end - start;
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    durationStr = `${hours}j ${mins}m`;
                }

                return {
                    id: item.id,
                    user_id: item.user_id,
                    employee_name: item.profiles?.full_name || "Tanpa Nama",
                    role: item.profiles?.role || "Staff",
                    date: new Date(item.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    }),
                    rawDate: new Date(item.date),
                    clock_in: item.clock_in
                        ? new Date(item.clock_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
                        : "-",
                    clock_out: item.clock_out
                        ? new Date(item.clock_out).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
                        : "-",
                    status: item.status || "Hadir",
                    durationStr,
                };
            });

            setAttendances(list);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAttendances();
    }, []);

    // Filter List Berdasarkan Tanggal & Status
    const filteredAttendances = useMemo(() => {
        const [startDate, endDate] = dateRange;

        return attendances.filter((item) => {
            if (selectedStatus !== "Semua" && item.status !== selectedStatus) return false;

            const itemDate = new Date(item.rawDate);
            itemDate.setHours(0, 0, 0, 0);

            let matchesStart = true;
            if (startDate) {
                const s = new Date(startDate);
                s.setHours(0, 0, 0, 0);
                matchesStart = itemDate >= s;
            }

            let matchesEnd = true;
            if (endDate) {
                const e = new Date(endDate);
                e.setHours(23, 59, 59, 999);
                matchesEnd = itemDate <= e;
            }

            return matchesStart && matchesEnd;
        });
    }, [attendances, dateRange, selectedStatus]);

    // Summary Cards
    const totalHadir = filteredAttendances.filter((a) => a.status === "Hadir").length;
    const totalTerlambat = filteredAttendances.filter((a) => a.status === "Terlambat").length;
    const totalIzin = filteredAttendances.filter((a) => a.status === "Izin" || a.status === "Alpha").length;

    return (
        <div className="p-4 sm:p-6 space-y-6 text-gray-800 dark:text-white">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Laporan &amp; Rekap Absensi Pegawai</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Pantau waktu presensi masuk/pulang serta jam kerja seluruh staf Framelo.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-4 shadow-xs">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-xl">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-medium uppercase text-gray-400">Total Hadir</span>
                        <h3 className="text-2xl font-bold text-emerald-600">{totalHadir} Presensi</h3>
                    </div>
                </div>

                <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-4 shadow-xs">
                    <div className="p-3 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-xl">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-medium uppercase text-gray-400">Terlambat</span>
                        <h3 className="text-2xl font-bold text-amber-500">{totalTerlambat} Pegawai</h3>
                    </div>
                </div>

                <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-4 shadow-xs">
                    <div className="p-3 bg-rose-100 dark:bg-rose-500/20 text-rose-600 rounded-xl">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-medium uppercase text-gray-400">Izin / Alpha</span>
                        <h3 className="text-2xl font-bold text-rose-500">{totalIzin} Keterangan</h3>
                    </div>
                </div>
            </div>

            {/* Filters & Controls */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

                    {/* RENTANG TANGGAL DENGAN CALENDER ICON & RESET */}
                    <div className="relative inline-flex items-center gap-2">
                        <div className="relative">
                            <CalenderIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10 w-6 h-6" />
                            <input
                                ref={datePickerRef}
                                className="h-9 w-52 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer focus:border-brand-500"
                                placeholder="Pilih rentang tanggal..."
                            />
                        </div>

                        {dateRange[0] && (
                            <button
                                onClick={handleResetDate}
                                className="text-xs text-rose-500 hover:underline font-medium cursor-pointer"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* FILTER STATUS */}
                    <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-medium dark:bg-gray-800">
                        {["Semua", "Hadir", "Terlambat", "Izin"].map((st) => (
                            <button
                                key={st}
                                onClick={() => setSelectedStatus(st)}
                                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${selectedStatus === st
                                        ? "bg-white text-gray-800 shadow-xs dark:bg-gray-700 dark:text-white font-bold"
                                        : "text-gray-500"
                                    }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabel Rekap */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="p-3">Nama Pegawai</th>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Jam Masuk</th>
                                <th className="p-3">Jam Pulang</th>
                                <th className="p-3">Durasi Kerja</th>
                                <th className="p-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-6 text-gray-400">
                                        Memuat data absensi...
                                    </td>
                                </tr>
                            ) : filteredAttendances.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-6 text-gray-400">
                                        Belum ada catatan presensi pada periode ini.
                                    </td>
                                </tr>
                            ) : (
                                filteredAttendances.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                        <td className="p-3">
                                            <p className="font-bold text-gray-800 dark:text-white">{row.employee_name}</p>
                                            <p className="text-xs text-gray-400">{row.role}</p>
                                        </td>
                                        <td className="p-3 text-gray-600 dark:text-gray-300">{row.date}</td>
                                        <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{row.clock_in}</td>
                                        <td className="p-3 font-semibold text-rose-500">{row.clock_out}</td>
                                        <td className="p-3 font-semibold text-gray-700 dark:text-gray-200">{row.durationStr}</td>
                                        <td className="p-3 text-center">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full font-bold text-xs uppercase ${row.status === "Hadir"
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                        : row.status === "Terlambat"
                                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                                    }`}
                                            >
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}