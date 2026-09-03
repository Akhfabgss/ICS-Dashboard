"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import RoleGuard from "@/components/auth/RoleGuard";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Users, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { CalenderIcon } from "@/icons";
import Swal from "sweetalert2";

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

    // State Modal Hapus Massal per Bulan
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [targetMonth, setTargetMonth] = useState<string>(
        new Date().toISOString().slice(0, 7) // Default YYYY-MM
    );
    const [deleting, setDeleting] = useState(false);

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

    // 1. AKSI HAPUS 1 BARIS ABSEN
    const handleDeleteSingle = async (id: string, name: string, dateStr: string) => {
        const res = await Swal.fire({
            title: "Hapus Absen Ini?",
            text: `Yakin ingin menghapus presensi ${name} pada tanggal ${dateStr}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#e11d48",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Ya, Hapus!",
            cancelButtonText: "Batal",
        });

        if (res.isConfirmed) {
            const { error } = await supabase.from("attendances").delete().eq("id", id);
            if (error) {
                Swal.fire("Gagal", "Gagal menghapus data: " + error.message, "error");
            } else {
                Swal.fire("Terhapus!", "Data presensi berhasil dihapus.", "success");
                fetchAttendances();
            }
        }
    };

    // 2. AKSI HAPUS 1 BULAN PENUH (DARI MODAL)
    const handleConfirmDeleteMonth = async () => {
        if (!targetMonth) return;

        const [year, month] = targetMonth.split("-").map(Number);
        const startDate = `${targetMonth}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${targetMonth}-${lastDay}`;

        const monthName = new Date(year, month - 1).toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
        });

        setDeleting(true);
        const { error } = await supabase
            .from("attendances")
            .delete()
            .gte("date", startDate)
            .lte("date", endDate);

        setDeleting(false);
        setIsDeleteModalOpen(false);

        if (error) {
            Swal.fire("Gagal", "Gagal menghapus data bulan: " + error.message, "error");
        } else {
            Swal.fire("Terhapus!", `Data presensi bulan ${monthName} berhasil dibersihkan.`, "success");
            fetchAttendances();
        }
    };

    // Filter List
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
                    Pantau waktu presensi masuk/pulang serta kelola catatan presensi staf.
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

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4 dark:border-gray-800">
                {/* RENTANG TANGGAL FILTER */}
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

                <div className="flex flex-wrap items-center gap-3">
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

                    {/* TOMBOL Buka Modal Hapus 1 Bulan (Tampil Bersih Tanpa Input Tanggal Menumpuk) */}
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="h-9 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/50"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus 1 Bulan</span>
                    </button>
                </div>
            </div>

            {/* Filters & Controls */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                {/* Tabel Rekap */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="p-3">Nama Pegawai</th>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Jam Masuk</th>
                                <th className="p-3">Jam Pulang</th>
                                <th className="p-3">Durasi Kerja</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-6 text-gray-400">
                                        Memuat data absensi...
                                    </td>
                                </tr>
                            ) : filteredAttendances.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-6 text-gray-400">
                                        Belum ada catatan presensi pada periode ini.
                                    </td>
                                </tr>
                            ) : (
                                filteredAttendances.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
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
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handleDeleteSingle(row.id, row.employee_name, row.date)}
                                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                title="Hapus presensi ini"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL BERSIHKAN DATA ABSEN 1 BULAN */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl space-y-4 text-gray-800 dark:text-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Hapus Presensi 1 Bulan</h3>
                                <p className="text-xs text-gray-400">Pilih periode bulan yang akan dibersihkan</p>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                                Pilih Bulan &amp; Tahun
                            </label>
                            <input
                                type="month"
                                value={targetMonth}
                                onChange={(e) => setTargetMonth(e.target.value)}
                                className="w-full h-10 px-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-medium text-gray-800 dark:text-white"
                            />
                            <p className="text-[11px] text-rose-500 pt-1">
                                ⚠️ Semua catatan absensi pegawai pada bulan yang dipilih akan dihapus permanen dari database.
                            </p>
                        </div>

                        {/* FOOTER BUTTONS - FIX KONTRAS DAN POSISI */}
                        <div className="flex justify-end items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={deleting || !targetMonth}
                                onClick={handleConfirmDeleteMonth}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-70 dark:bg-rose-600 dark:hover:bg-rose-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-gray-500 dark:text-white" />
                                <span>{deleting ? "Menghapus..." : "Hapus Permanen"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}