"use client";

import React from "react";
import { LabInventoryItem } from "@/types/inventory";
import { DollarSign, CreditCard, Activity, AlertTriangle } from "lucide-react";

interface Props {
  totalRevenue: number;
  totalExpense: number;
  activeCount: number;
  completedCount: number;
  criticalInventory: LabInventoryItem[];
  loading?: boolean;
}

export default function GradingMetricsCards({
  totalRevenue,
  totalExpense,
  activeCount,
  completedCount,
  criticalInventory,
  loading = false,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Revenue */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Total Revenue (Pemasukan)
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">
            Rp {totalRevenue.toLocaleString("id-ID")}
          </h3>
          <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Akumulasi bruto submisi
          </p>
        </div>
      </div>

      {/* 2. Total Pengeluaran */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Total Pengeluaran (Expense)
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">
            Rp {totalExpense.toLocaleString("id-ID")}
          </h3>
          <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
            Biaya operasional &amp; bahan lab
          </p>
        </div>
      </div>

      {/* 3. Submisi Aktif & Selesai */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Submisi Aktif &amp; Selesai
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <Activity className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {activeCount} <span className="text-xs font-semibold text-gray-400">Proses</span>
            </h3>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {completedCount} Selesai
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            Status pengerjaan fisik kartu
          </p>
        </div>
      </div>

      {/* 4. Stok Bahan Lab Kritis */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Stok Bahan Lab Kritis
          </span>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${criticalInventory.length > 0
              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">
            {criticalInventory.length} <span className="text-xs font-semibold text-gray-400">Item Menipis</span>
          </h3>
          <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 truncate">
            {criticalInventory.length > 0
              ? criticalInventory.map((i) => i.name).join(", ")
              : "Semua pasokan aman"}
          </p>
        </div>
      </div>
    </div>
  );
}