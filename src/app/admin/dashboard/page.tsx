"use client";

import React, { useEffect, useState, useMemo } from "react";
import GradingMetricsCards from "@/components/dashboard/GradingMetricsCards";
import SubmissionTrendsChart, {
  DashboardSubmissionItem,
} from "@/components/dashboard/SubmissionTrendsChart";
import TCGCategoryChart, {
  DashboardCardRegistryRow,
} from "@/components/dashboard/TCGCategoryChart";
import RecentSubmissionsTable from "@/components/dashboard/RecentSubmissionsTable";
import { supabase } from "@/lib/supabase";
import { LabInventoryItem } from "@/types/inventory";
import { CashFlowTransaction } from "@/types/finance";
import { ServiceCategory } from "@/types/product";
import { Shield, Sparkles, RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<DashboardSubmissionItem[]>([]);
  const [cardRows, setCardRows] = useState<DashboardCardRegistryRow[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [inventory, setInventory] = useState<LabInventoryItem[]>([]);
  const [finances, setFinances] = useState<CashFlowTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [subsRes, cardsRes, catsRes, invRes, finRes] = await Promise.all([
        supabase.from("submissions").select("*").order("created_at", { ascending: false }),
        supabase
          .from("card_registry")
          .select("submission_id, card_name, set_name, tcg_type, final_grade, cert_number"),
        supabase.from("product_categories").select("*").order("created_at", { ascending: true }),
        supabase.from("lab_inventory").select("*"),
        supabase.from("cash_flows").select("*"),
      ]);

      const rawCards = (cardsRes.data as any[]) || [];
      setCardRows(
        rawCards.map((c) => ({
          submission_id: c.submission_id,
          tcg_type: c.tcg_type || "OTHER",
        }))
      );

      // Petakan item pertama tiap submisi untuk tabel RecentSubmissionsTable
      const firstCardMap: Record<string, any> = {};
      rawCards.forEach((c) => {
        if (!firstCardMap[c.submission_id]) {
          firstCardMap[c.submission_id] = c;
        }
      });

      if (subsRes.data) {
        const formattedSubs: DashboardSubmissionItem[] = subsRes.data.map((sub: any) => {
          const firstCard = firstCardMap[sub.id];
          return {
            id: sub.id,
            order_no: sub.order_no,
            collector_name: sub.collector_name,
            category_name: sub.category_name || "Card / TCG",
            total_cards: Number(sub.total_cards) || 1,
            total_price: Number(sub.total_price) || 0,
            payment_status: sub.payment_status || "UNPAID",
            status: sub.status || "PENDING_RECEIPT",
            created_at: sub.created_at,
            card_name: firstCard?.card_name || "Item Koleksi",
            card_set: firstCard?.set_name || "",
            tcg_category: firstCard?.tcg_type || "",
            final_grade: Number(firstCard?.final_grade) || 0,
            cert_id: firstCard?.cert_number || "",
          };
        });
        setSubmissions(formattedSubs);
      }

      if (catsRes.data) setCategories(catsRes.data as ServiceCategory[]);
      if (invRes.data) setInventory(invRes.data as LabInventoryItem[]);
      if (finRes.data) setFinances(finRes.data as CashFlowTransaction[]);
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Kalkulasi 4 Metrik Utama langsung dari Supabase
  const metrics = useMemo(() => {
    // 1. Total Revenue dari cash_flows (income)
    const totalRev = finances
      .filter((f) => f.type === "income")
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);

    // 2. Total Pengeluaran dari cash_flows (expense)
    const totalExpense = finances
      .filter((f) => f.type === "expense")
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);

    // 3. Submisi Aktif & Selesai dari kolom status tabel submissions
    const active = submissions.filter(
      (s) => s.status !== "COMPLETED" && s.status !== "REJECTED"
    ).length;

    const completed = submissions.filter((s) => s.status === "COMPLETED").length;

    // 4. Stok Bahan Menipis dari tabel lab_inventory
    const critical = inventory.filter(
      (i) => Number(i.current_stock) <= Number(i.min_stock || 0) || i.status === "Menipis"
    );

    return {
      totalRev,
      totalExpense,
      active,
      completed,
      critical,
    };
  }, [submissions, inventory, finances]);

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white backdrop-blur-sm border border-white/20">
                <Shield className="w-3.5 h-3.5 text-brand-400" />
                Indonesia Collectible Standard Lab
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3 h-3" />
                Sonic Enkapsulasi &amp; NFC Live
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
              Ringkasan Eksekutif ICS Grading Lab
            </h1>
            <p className="mt-1 text-sm text-gray-300 max-w-2xl">
              Monitoring performa autentikasi koleksi, rasio arus kas keuangan, ketersediaan bahan lab, dan aktivitas grading harian.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all border border-white/10 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Segarkan Data
            </button>
          </div>
        </div>
      </div>

      {/* 1. Ringkasan 4 Metrik Kartu */}
      <GradingMetricsCards
        totalRevenue={metrics.totalRev}
        totalExpense={metrics.totalExpense}
        activeCount={metrics.active}
        completedCount={metrics.completed}
        criticalInventory={metrics.critical}
        loading={loading}
      />

      {/* 2. Visualisasi Grafik & Distribusi Kategori */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SubmissionTrendsChart submissions={submissions} />
        </div>
        <div className="lg:col-span-1">
          <TCGCategoryChart
            categories={categories}
            submissions={submissions}
            cards={cardRows}
          />
        </div>
      </div>

      {/* 3. Tabel Quick-Access Submisi Terbaru */}
      <div className="w-full">
        <RecentSubmissionsTable submissions={submissions} loading={loading} />
      </div>
    </div>
  );
}