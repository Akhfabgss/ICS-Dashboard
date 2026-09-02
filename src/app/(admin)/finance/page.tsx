"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import RoleGuard from "@/components/auth/RoleGuard";

interface CashFlowItem {
  id: string; // ID Tampilan (Order/CF-xxx)
  dbId?: string; // ID Asli di Database finances
  date: string;
  rawDate: Date;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: string;
  rawAmount: number;
  isManual: boolean; // Flag untuk membedakan transaksi manual vs order/reseller
  sourceType?: "Order" | "Reseller" | "Manual";
}

export default function FinancePage() {
  return (
    <RoleGuard allowedRoles={["Owner", "Bendahara"]}>
      <FinanceContent />
    </RoleGuard>
  );
}

function FinanceContent() {
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // State untuk Edit Transaksi
  const [editingId, setEditingId] = useState<string | null>(null);

  // State Data Arus Kas
  const [cashFlows, setCashFlows] = useState<CashFlowItem[]>([]);

  // State Form Modal
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [expenseCategory, setExpenseCategory] = useState("Restock Bahan / Stok Barang");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch Data dari Database Supabase (Gabungan Orders & Finances)
  const fetchFinanceData = async () => {
    setLoading(true);

    // 1. Fetch Data Pemasukan dari Pesanan (Orders) yang sudah terbayar
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, dp_amount, repayment_amount, created_at");

    // 2. Fetch Data dari Tabel Finances
    const { data: financesData } = await supabase
      .from("finances")
      .select("id, title, income, expense, notes, created_at, reseller_id");

    const flowList: CashFlowItem[] = [];

    // Transform Data Orders ke Pemasukan (Income)
    if (ordersData) {
      ordersData.forEach((ord) => {
        const totalPaid = Number(ord.dp_amount || 0) + Number(ord.repayment_amount || 0);
        if (totalPaid > 0) {
          flowList.push({
            id: ord.order_number,
            date: new Date(ord.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            rawDate: new Date(ord.created_at),
            type: "income",
            category: "Penjualan Order",
            description: `Pembayaran Order #${ord.order_number} (${ord.customer_name})`,
            amount: `Rp ${totalPaid.toLocaleString("id-ID")}`,
            rawAmount: totalPaid,
            isManual: false,
            sourceType: "Order",
          });
        }
      });
    }

    // Transform Data Finances
    if (financesData) {
      financesData.forEach((fin, idx) => {
        const isIncome = Number(fin.income) > 0;
        const amountVal = isIncome ? Number(fin.income) : Number(fin.expense);

        // Pengecekan apakah transaksi ini berasal dari Komisi Reseller
        const isReseller =
          Boolean(fin.reseller_id) ||
          (fin.notes && fin.notes.includes("[OTOMATIS_RESELLER]")) ||
          (fin.title && fin.title.startsWith("Komisi Reseller"));

        let finalCategory = fin.title;
        let cleanDescription = fin.notes || "-";

        if (isReseller) {
          finalCategory = "Komisi Reseller";
          cleanDescription = (fin.notes || "").replace(/\[OTOMATIS_[A-Z_]+\]\s*/g, "");
        }

        flowList.push({
          id: `CF-${String(idx + 1).padStart(3, "0")}`,
          dbId: fin.id,
          date: new Date(fin.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          rawDate: new Date(fin.created_at),
          type: isIncome ? "income" : "expense",
          category: finalCategory,
          description: cleanDescription,
          amount: `Rp ${amountVal.toLocaleString("id-ID")}`,
          rawAmount: amountVal,
          isManual: !isReseller,
          sourceType: isReseller ? "Reseller" : "Manual",
        });
      });
    }

    // Sort berdasarkan tanggal terbaru
    flowList.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    setCashFlows(flowList);
    setLoading(false);
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  // Kalkulasi Total Statistik
  const totalIncome = useMemo(() => {
    return cashFlows
      .filter((item) => item.type === "income")
      .reduce((acc, curr) => acc + curr.rawAmount, 0);
  }, [cashFlows]);

  const totalExpense = useMemo(() => {
    return cashFlows
      .filter((item) => item.type === "expense")
      .reduce((acc, curr) => acc + curr.rawAmount, 0);
  }, [cashFlows]);

  const netProfit = totalIncome - totalExpense;

  // Filter Data Arus Kas
  const filteredFlows = cashFlows.filter((flow) => {
    if (filterType === "income") return flow.type === "income";
    if (filterType === "expense") return flow.type === "expense";
    return true;
  });

  // Handler Hapus Transaksi Manual
  const handleDelete = async (dbId: string) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: "Apakah kamu yakin ingin menghapus transaksi ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("finances").delete().eq("id", dbId);

    if (error) {
      Swal.fire("Error!", "Gagal menghapus: " + error.message, "error");
    } else {
      Swal.fire("Terhapus!", "Transaksi berhasil dihapus.", "success");
      fetchFinanceData();
    }
  };

  // Handler Buka Modal Edit
  const handleOpenEdit = (flow: CashFlowItem) => {
    if (!flow.dbId) return;
    setEditingId(flow.dbId);
    setTransactionType(flow.type);
    setExpenseCategory(flow.category);
    setExpenseAmount(String(flow.rawAmount));
    setExpenseNotes(flow.description === "-" ? "" : flow.description);
    setIsExpenseModalOpen(true);
  };

  // Reset Modal ke Mode Tambah Baru
  const handleOpenNew = () => {
    setEditingId(null);
    setTransactionType("expense");
    setExpenseCategory("Restock Bahan / Stok Barang");
    setExpenseAmount("");
    setExpenseNotes("");
    setIsExpenseModalOpen(true);
  };

  // Submit Transaksi Baru / Edit
  const handleSaveExpense = async () => {
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      Swal.fire("Perhatian", "Masukkan nominal transaksi yang valid!", "warning");
      return;
    }

    setSubmitting(true);
    const isExpense = transactionType === "expense";
    const numAmount = Number(expenseAmount);

    const payload = {
      title: expenseCategory,
      income: isExpense ? 0 : numAmount,
      expense: isExpense ? numAmount : 0,
      notes: expenseNotes,
    };

    let error;
    if (editingId) {
      const res = await supabase.from("finances").update(payload).eq("id", editingId);
      error = res.error;
    } else {
      const res = await supabase.from("finances").insert([payload]);
      error = res.error;
    }

    setSubmitting(false);

    if (error) {
      Swal.fire("Error!", "Gagal menyimpan transaksi: " + error.message, "error");
    } else {
      Swal.fire("Berhasil!", editingId ? "Transaksi berhasil diperbarui." : "Transaksi berhasil ditambahkan.", "success");
      setIsExpenseModalOpen(false);
      setExpenseAmount("");
      setExpenseNotes("");
      setEditingId(null);
      fetchFinanceData();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 1. HEADER & TOMBOL INPUT PENGELUARAN */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Keuangan &amp; Arus Kas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Catat pemasukan dari penjualan dan pengeluaran operasional toko.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="px-4 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
        >
          <span>+</span> Catat Keuangan
        </button>
      </div>

      {/* 2. STATISTIK ARUS KAS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium uppercase text-gray-400">Total Pemasukan (Income)</span>
          <h3 className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            Rp {totalIncome.toLocaleString("id-ID")}
          </h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium uppercase text-gray-400">Total Pengeluaran (Expense)</span>
          <h3 className="mt-1 text-2xl font-bold text-rose-500">
            Rp {totalExpense.toLocaleString("id-ID")}
          </h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium uppercase text-gray-400">Sisa Kas (Net Profit)</span>
          <h3 className={`mt-1 text-2xl font-bold ${netProfit < 0 ? "text-rose-500" : "text-gray-800 dark:text-white"}`}>
            Rp {netProfit.toLocaleString("id-ID")}
          </h3>
        </div>
      </div>

      {/* 3. TABEL ARUS KAS (CASH FLOW) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Riwayat Mutasi Kas</h3>

          {/* Filter Tab */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-medium dark:bg-gray-800">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg transition ${filterType === "all"
                ? "bg-white text-gray-800 shadow-xs dark:bg-gray-700 dark:text-white"
                : "text-gray-500"
                }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType("income")}
              className={`px-3 py-1.5 rounded-lg transition ${filterType === "income"
                ? "bg-white text-emerald-600 shadow-xs dark:bg-gray-700 dark:text-emerald-400"
                : "text-gray-500"
                }`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={`px-3 py-1.5 rounded-lg transition ${filterType === "expense"
                ? "bg-white text-rose-500 shadow-xs dark:bg-gray-700 dark:text-rose-400"
                : "text-gray-500"
                }`}
            >
              Pengeluaran
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="p-3">ID &amp; Tanggal</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-right">Nominal</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400">
                    Memuat data kas...
                  </td>
                </tr>
              ) : filteredFlows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400">
                    Belum ada riwayat mutasi kas.
                  </td>
                </tr>
              ) : (
                filteredFlows.map((flow) => (
                  <tr key={flow.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <td className="p-3">
                      <p className="font-semibold text-gray-800 dark:text-white">{flow.id}</p>
                      <span className="text-xs text-gray-400">{flow.date}</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${flow.type === "income"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500"
                          }`}
                      >
                        {flow.type === "income" ? "INCOME" : "EXPENSE"}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">{flow.category}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{flow.description}</td>
                    <td
                      className={`p-3 text-right font-bold ${flow.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-500"
                        }`}
                    >
                      {flow.type === "income" ? `+ ${flow.amount}` : `- ${flow.amount}`}
                    </td>
                    <td className="p-3 text-center">
                      {flow.isManual ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(flow)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => flow.dbId && handleDelete(flow.dbId)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic font-medium">
                          {flow.sourceType === "Reseller" ? "Otomatis (Reseller)" : "Otomatis (Order)"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL CATAT PENGELUARAN / TRANSAKSI */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              {editingId ? "Edit Catatan Kas" : "Catat Pengeluaran Baru"}
            </h3>
            <div className="space-y-4">
              {/* Jenis Transaksi */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipe Transaksi</label>
                <select
                  value={transactionType}
                  onChange={(e) => {
                    const type = e.target.value as "expense" | "income";
                    setTransactionType(type);
                    setExpenseCategory(
                      type === "expense" ? "Restock Bahan / Stok Barang" : "Pemasukan Lainnya"
                    );
                  }}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="expense">Pengeluaran (Expense)</option>
                  <option value="income">Pemasukan (Income)</option>
                </select>
              </div>

              {/* Kategori Dinamis */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {transactionType === "expense" ? (
                    <>
                      <option value="Restock Bahan / Stok Barang">Restock Bahan / Stok Barang</option>
                      <option value="Operasional (Listrik/Wifi/Air)">Operasional (Listrik/Wifi/Air)</option>
                      <option value="Gaji Karyawan">Gaji Karyawan</option>
                      <option value="Sewa Tempat">Sewa Tempat</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </>
                  ) : (
                    <>
                      <option value="Pemasukan Lainnya">Pemasukan Lainnya</option>
                      <option value="Modal Usaha / Investor">Modal Usaha / Investor</option>
                      <option value="Penjualan Non-Order">Penjualan Non-Order</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nominal (Rp)</label>
                <input
                  type="text"
                  placeholder="500000"
                  value={expenseAmount ? Number(expenseAmount).toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, "");
                    setExpenseAmount(rawValue);
                  }}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Keterangan / Catatan</label>
                <textarea
                  rows={3}
                  placeholder="Pembelian lakban dan dus packing..."
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsExpenseModalOpen(false);
                  setEditingId(null);
                }}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveExpense}
                disabled={submitting}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : editingId ? "Perbarui" : "Simpan Catatan keuangan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}