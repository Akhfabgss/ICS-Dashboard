"use client";

import React from "react";
import { Layers, Clock, CheckCircle2, AlertOctagon } from "lucide-react";

interface Props {
  submissions: any[];
  loading?: boolean;
}

export default function SubmissionMetricsCards({ submissions, loading = false }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const total = submissions.length;

  // Filter dengan mengecek s.status (Enum DB) dan fallback s.workflow_status
  const active = submissions.filter((s) => {
    const st = s.status || s.workflow_status;
    return st !== "COMPLETED" && st !== "Selesai & Kirim" && st !== "REJECTED" && st !== "Ditolak";
  }).length;

  const completed = submissions.filter((s) => {
    const st = s.status || s.workflow_status;
    return st === "COMPLETED" || st === "Selesai & Kirim";
  }).length;

  const rejected = submissions.filter((s) => {
    const st = s.status || s.workflow_status;
    return st === "REJECTED" || st === "Ditolak";
  }).length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Submisi */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Submisi</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">{total} Order</h3>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">Keseluruhan pemesanan</p>
        </div>
      </div>

      {/* 2. Submisi Dalam Proses */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sedang Diproses</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">{active} Kartu</h3>
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">Antrian lab active</p>
        </div>
      </div>

      {/* 3. Submisi Selesai */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Selesai &amp; Terkirim</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">{completed} Kartu</h3>
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">Slab &amp; cert terbit</p>
        </div>
      </div>

      {/* 4. Submisi Ditolak */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Ditolak / Counterfeit</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertOctagon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">{rejected} Kartu</h3>
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">Tidak lolos autentikasi</p>
        </div>
      </div>
    </div>
  );
}