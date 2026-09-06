"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import RoleGuard from "@/components/auth/RoleGuard";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon } from "@/icons"; // Sesuaikan dengan icon tanggal kamu

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
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ref Flatpickr
  const datePickerRef = useRef<HTMLInputElement | null>(null);
  const fpInstance = useRef<flatpickr.Instance | null>(null);

  // State Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cashFlows, setCashFlows] = useState<CashFlowItem[]>([]);

  // State Form Modal
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [expenseCategory, setExpenseCategory] = useState("Restock Bahan / Stok Barang");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Inisialisasi Flatpickr Rentang Tanggal
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
      if (fpInstance.current) {
        fpInstance.current.destroy();
      }
    };
  }, []);

  const handleResetDate = () => {
    setDateRange([null, null]);
    if (fpInstance.current) {
      fpInstance.current.clear();
    }
  };

  // Helper Preset Cepat (Misal: Bulan Lalu / Minggu Lalu)
  const setQuickRange = (type: "last_week" | "last_month") => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (type === "last_week") {
      // 7 Hari - 14 Hari lalu (Minggu Kemarin)
      start.setDate(now.getDate() - 14);
      end.setDate(now.getDate() - 7);
    } else if (type === "last_month") {
      // Bulan lalu full
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    setDateRange([start, end]);
    if (fpInstance.current) {
      fpInstance.current.setDate([start, end], true);
    }
  };

  // Fetch Data dari Database Supabase
  const fetchFinanceData = async () => {
    setLoading(true);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, dp_amount, repayment_amount, created_at");

    const { data: financesData } = await supabase
      .from("finances")
      .select("id, title, income, expense, notes, created_at, reseller_id");

    const flowList: CashFlowItem[] = [];

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

    if (financesData) {
      financesData.forEach((fin, idx) => {
        const isIncome = Number(fin.income) > 0;
        const amountVal = isIncome ? Number(fin.income) : Number(fin.expense);

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

    flowList.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    setCashFlows(flowList);
    setLoading(false);
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  // Filter Dinamis Berdasarkan Single Input Date Range
  const filteredFlows = useMemo(() => {
    const [startDate, endDate] = dateRange;

    return cashFlows.filter((flow) => {
      // Filter Tipe (Income / Expense / All)
      if (filterType === "income" && flow.type !== "income") return false;
      if (filterType === "expense" && flow.type !== "expense") return false;

      // Filter Rentang Tanggal Bebas
      const flowDate = new Date(flow.rawDate);
      flowDate.setHours(0, 0, 0, 0);

      let matchesStart = true;
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        matchesStart = flowDate >= s;
      }

      let matchesEnd = true;
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        matchesEnd = flowDate <= e;
      }

      return matchesStart && matchesEnd;
    });
  }, [cashFlows, filterType, dateRange]);

  // Total Statistik Mengikuti Hasil Filter Tanggal
  const totalIncome = useMemo(() => {
    return filteredFlows
      .filter((item) => item.type === "income")
      .reduce((acc, curr) => acc + curr.rawAmount, 0);
  }, [filteredFlows]);

  const totalExpense = useMemo(() => {
    return filteredFlows
      .filter((item) => item.type === "expense")
      .reduce((acc, curr) => acc + curr.rawAmount, 0);
  }, [filteredFlows]);

  const netProfit = totalIncome - totalExpense;

  // Handler Hapus & Form Modals
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

  const handleOpenEdit = (flow: CashFlowItem) => {
    if (!flow.dbId) return;
    setEditingId(flow.dbId);
    setTransactionType(flow.type);
    setExpenseCategory(flow.category);
    setExpenseAmount(String(flow.rawAmount));
    setExpenseNotes(flow.description === "-" ? "" : flow.description);
    setIsExpenseModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setTransactionType("expense");
    setExpenseCategory("Restock Bahan / Stok Barang");
    setExpenseAmount("");
    setExpenseNotes("");
    setIsExpenseModalOpen(true);
  };

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
      Swal.fire(
        "Berhasil!",
        editingId ? "Transaksi berhasil diperbarui." : "Transaksi berhasil ditambahkan.",
        "success"
      );
      setIsExpenseModalOpen(false);
      setExpenseAmount("");
      setExpenseNotes("");
      setEditingId(null);
      fetchFinanceData();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 1. HEADER */}
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

      {/* 2. STATISTIK ARUS KAS (OTOMATIS BERUBAH IKUT FILTER TANGGAL) */}
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

      {/* 3. TABEL ARUS KAS & FILTER FLEXIBLE DATE RANGE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4 dark:border-gray-800">
        {/* Single Input Date Range Picker */}
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
              className="text-xs text-rose-500 hover:underline font-medium"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-medium dark:bg-gray-800">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1 rounded-lg transition ${filterType === "all"
              ? "bg-white text-gray-800 shadow-xs dark:bg-gray-700 dark:text-white"
              : "text-gray-500"
              }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterType("income")}
            className={`px-3 py-1 rounded-lg transition ${filterType === "income"
              ? "bg-white text-emerald-600 shadow-xs dark:bg-gray-700 dark:text-emerald-400"
              : "text-gray-500"
              }`}
          >
            Pemasukan
          </button>
          <button
            onClick={() => setFilterType("expense")}
            className={`px-3 py-1 rounded-lg transition ${filterType === "expense"
              ? "bg-white text-rose-500 shadow-xs dark:bg-gray-700 dark:text-rose-400"
              : "text-gray-500"
              }`}
          >
            Pengeluaran
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
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
                    Belum ada riwayat mutasi kas pada rentang tanggal ini.
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
                      <option value="Operasional">Operasional</option>
                      <option value="Gaji Karyawan">Gaji Karyawan</option>
                      <option value="Sewa Tempat">Sewa Tempat</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </>
                  ) : (
                    <>
                      <option value="Pemasukan Lainnya">Pemasukan Lainnya</option>
                      <option value="Modal Usaha / Investor">Modal Usaha / Investor</option>
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
                  placeholder="Pembelian lakban dan dus Packaging..."
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