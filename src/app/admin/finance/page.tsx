"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { CashFlowTransaction, CashFlowType, FinanceCategory } from "@/types/finance";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Plus,
  Calendar,
  Trash2,
  Clock,
  Search,
  RefreshCw,
} from "lucide-react";

const CATEGORIES: FinanceCategory[] = [
  "Pemasukan Submisi",
  "Pembelian Stok Slab",
  "Pengadaan Chip NFC & Security",
  "Gaji & Operasional Lab",
  "Utilitas & Pemeliharaan Mesin",
  "Lainnya",
];

export default function FinancePage() {
  const [transactions, setTransactions] = useState<CashFlowTransaction[]>([]);
  const [totalReceivables, setTotalReceivables] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  // Modal State Input Manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingTx, setSavingTx] = useState(false);
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txRefId, setTxRefId] = useState("");
  const [txCategory, setTxCategory] = useState<FinanceCategory>("Pembelian Stok Slab");
  const [txDescription, setTxDescription] = useState("");
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txType, setTxType] = useState<CashFlowType>("expense");

  const datePickerRef = useRef<HTMLInputElement | null>(null);
  const fpInstance = useRef<flatpickr.Instance | null>(null);

  // Fetch Data Arus Kas & Piutang Submisi dari Supabase
  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Arus Kas (Otomatis dari Submisi + Manual)
      const { data: cashData, error: cashError } = await supabase
        .from("cash_flows")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!cashError && cashData) {
        setTransactions(cashData as CashFlowTransaction[]);
      }

      // 2. Fetch Total Piutang dari Submisi yang Belum Lunas (UNPAID / DP)
      const { data: subData, error: subError } = await supabase
        .from("submissions")
        .select("total_price, dp_amount, repayment_amount, payment_status")
        .neq("payment_status", "PAID");

      if (!subError && subData) {
        const sumReceivables = subData.reduce((sum, item: any) => {
          const total = Number(item.total_price) || 0;
          const paid = (Number(item.dp_amount) || 0) + (Number(item.repayment_amount) || 0);
          const sisa = Math.max(0, total - paid);
          return sum + sisa;
        }, 0);
        setTotalReceivables(sumReceivables);
      }
    } catch (e) {
      console.warn("Gagal mengambil data keuangan:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();

    // Realtime listener agar setiap pelunasan submisi langsung memperbarui Finance
    const channel = supabase
      .channel("finance-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cash_flows" },
        () => fetchFinanceData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => fetchFinanceData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Flatpickr range
  useEffect(() => {
    if (datePickerRef.current) {
      fpInstance.current = flatpickr(datePickerRef.current, {
        mode: "range",
        dateFormat: "Y-m-d",
        onChange: (dates) => {
          if (dates.length === 2) {
            setDateRange([dates[0], dates[1]]);
          } else if (dates.length === 0) {
            setDateRange([null, null]);
          }
        },
      });
    }

    return () => {
      fpInstance.current?.destroy();
    };
  }, []);

  const handleResetDate = () => {
    setDateRange([null, null]);
    fpInstance.current?.clear();
  };

  // Metrics summary otomatis (Pemasukan, Pengeluaran, Net Profit)
  const summary = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const netProfit = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netProfit,
    };
  }, [transactions]);

  // Buka Modal & Hasilkan Ref ID Otomatis
  const handleOpenModal = () => {
    const defaultType: CashFlowType = "expense";
    setTxType(defaultType);
    setTxCategory("Pembelian Stok Slab");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxRefId(`NOTA-${Math.floor(100000 + Math.random() * 900000)}`);
    setTxAmount(0);
    setTxDescription("");
    setIsModalOpen(true);
  };

  // Handle Save Transaction Manual Ke Supabase
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(txAmount) <= 0) {
      Swal.fire("Nominal Tidak Valid", "Masukkan nominal transaksi lebih dari 0.", "warning");
      return;
    }

    setSavingTx(true);
    const newTx = {
      date: txDate,
      ref_id: txRefId || `${txType === "income" ? "REV" : "NOTA"}-${Math.floor(100000 + Math.random() * 900000)}`,
      category: txCategory,
      description: txDescription.trim(),
      amount: Number(txAmount),
      type: txType,
    };

    try {
      const { data, error } = await supabase
        .from("cash_flows")
        .insert(newTx)
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setTransactions((prev) => [data as CashFlowTransaction, ...prev]);
      }
      setIsModalOpen(false);
      Swal.fire("Berhasil Dicatat!", `Transaksi ${newTx.ref_id} telah tersimpan.`, "success");
    } catch (err: any) {
      Swal.fire("Gagal Menyimpan!", err.message || "Periksa koneksi atau policy RLS Supabase.", "error");
    } finally {
      setSavingTx(false);
    }
  };

  // Handle Delete Transaction dari Supabase
  const handleDeleteTransaction = async (id: string, refId: string) => {
    const result = await Swal.fire({
      title: "Hapus Transaksi?",
      text: `Hapus catatan arus kas ${refId}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from("cash_flows").delete().eq("id", id);
        if (error) throw error;

        setTransactions((prev) => prev.filter((t) => t.id !== id));
        Swal.fire("Terhapus!", "Catatan transaksi telah dihapus.", "success");
      } catch (err: any) {
        Swal.fire("Gagal Menghapus!", err.message, "error");
      }
    }
  };

  // Filtered List
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (selectedCategory && t.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = (t.ref_id || "").toLowerCase().includes(q);
        const matchDesc = (t.description || "").toLowerCase().includes(q);
        const matchCat = (t.category || "").toLowerCase().includes(q);
        if (!matchRef && !matchDesc && !matchCat) return false;
      }
      if (dateRange[0] && dateRange[1]) {
        const itemDate = new Date(t.date);
        if (itemDate < dateRange[0] || itemDate > dateRange[1]) return false;
      }
      return true;
    });
  }, [transactions, filterType, selectedCategory, searchQuery, dateRange]);

  return (
    <div className="space-y-6">
      {/* 1. Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-600" />
            Keuangan &amp; Arus Kas Lab ICS
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Otomatis terisi saat submisi dilunasi, serta mendukung pencatatan kas masuk &amp; keluar manual.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchFinanceData}
            title="Refresh Data Keuangan"
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Transaksi Kas
          </button>
        </div>
      </div>

      {/* 2. CARDS RINGKASAN KEUANGAN (OTOMATIS) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Pemasukan */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400">
              Total Pemasukan (Income)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {loading ? "..." : `Rp ${summary.totalIncome.toLocaleString("id-ID")}`}
          </h3>
          <p className="mt-1 text-xs text-gray-400">Submisi Lunas &amp; Kas Masuk Manual</p>
        </div>

        {/* Total Pengeluaran */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400">
              Total Pengeluaran (Expense)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-black text-rose-600 dark:text-rose-400">
            {loading ? "..." : `Rp ${summary.totalExpense.toLocaleString("id-ID")}`}
          </h3>
          <p className="mt-1 text-xs text-gray-400">Restock Slab, NFC, &amp; Operasional</p>
        </div>

        {/* Sisa Kas (Net Profit) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400">
              Sisa Kas (Net Profit)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3
            className={`mt-3 text-2xl font-black ${summary.netProfit >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600"
              }`}
          >
            {loading ? "..." : `Rp ${summary.netProfit.toLocaleString("id-ID")}`}
          </h3>
          <p className="mt-1 text-xs text-gray-400">Saldo Bersih Arus Kas</p>
        </div>

        {/* Total Piutang Submisi */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-amber-700 dark:text-amber-400">
              Total Piutang Submisi
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-black text-amber-700 dark:text-amber-400">
            {loading ? "..." : `Rp ${totalReceivables.toLocaleString("id-ID")}`}
          </h3>
          <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80">
            Sisa Tagihan Submisi Belum Lunas
          </p>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Type Filter */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl font-semibold">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterType === "all"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500"
                }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType("income")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterType === "income"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-gray-500"
                }`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filterType === "expense"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-gray-500"
                }`}
            >
              Pengeluaran
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Ref ID / Order / Catatan..."
              className="pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Kategori Dropdown Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-medium cursor-pointer"
          >
            <option value="">Semua Kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={datePickerRef}
              placeholder="Rentang Tanggal..."
              className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs cursor-pointer focus:outline-none"
            />
          </div>
          {(dateRange[0] || selectedCategory || filterType !== "all" || searchQuery) && (
            <button
              onClick={() => {
                setFilterType("all");
                setSelectedCategory("");
                setSearchQuery("");
                handleResetDate();
              }}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. TABEL ARUS KAS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400 tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Ref ID</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Keterangan / Sumber</th>
                <th className="py-3 px-3 text-right">Nominal (Rp)</th>
                <th className="py-3 px-3 text-center">Tipe Transaksi</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Memuat mutasi keuangan...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Tidak ada catatan arus kas yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isAutoSub = tx.description?.includes("#SUB-");
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {tx.ref_id}
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {tx.category}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-300 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{tx.description}</span>
                          {isAutoSub && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 text-[9px] font-bold">
                              AUTO SUBMISI
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-black whitespace-nowrap">
                        <span
                          className={
                            tx.type === "income"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {tx.type === "income" ? "+" : "-"} Rp{" "}
                          {Number(tx.amount || 0).toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${tx.type === "income"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400"
                            }`}
                        >
                          {tx.type === "income" ? "Pemasukan" : "Pengeluaran"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id, tx.ref_id)}
                          title="Hapus Catatan Kas"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT TRANSAKSI KAS MANUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Catat Transaksi Kas Manual
            </h3>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tipe Transaksi *
                </label>
                <select
                  value={txType}
                  onChange={(e) => {
                    const newType = e.target.value as CashFlowType;
                    setTxType(newType);
                    const prefix = newType === "income" ? "REV" : "NOTA";
                    setTxRefId(`${prefix}-${Math.floor(100000 + Math.random() * 900000)}`);
                    if (newType === "income") {
                      setTxCategory("Pemasukan Submisi");
                    } else {
                      setTxCategory("Pembelian Stok Slab");
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold cursor-pointer"
                >
                  <option value="income">Pemasukan (Income)</option>
                  <option value="expense">Pengeluaran (Expense)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Ref ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={txRefId}
                    onChange={(e) => setTxRefId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Kategori *
                </label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value as FinanceCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-medium cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nominal (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={txAmount || ""}
                  onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Rp 0"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-black text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Keterangan / Catatan *
                </label>
                <textarea
                  required
                  rows={2}
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="Contoh: Restock 100 pcs Acrylic Slab Shells Standard..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingTx}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingTx ? "Menyimpan..." : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}