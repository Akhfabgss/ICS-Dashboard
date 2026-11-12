"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { UserProfile } from "@/types/users";
import SubmissionMetricsCards from "@/components/submissions/SubmissionMetricsCards";
import SubmissionInvoiceModal from "@/components/submissions/SubmissionInvoiceModal";
import SubmissionCertReportModal from "@/components/submissions/SubmissionCertReportModal";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import {
  Search,
  Plus,
  FileText,
  Award,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Layers,
} from "lucide-react";

export interface SubmissionRecord {
  id: string;
  order_no: string;
  collector_name: string;
  phone_number: string;
  address: string;
  total_cards: number;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total_price: number;
  payment_status: "UNPAID" | "DP" | "PAID";
  status: string; // PENDING_RECEIPT, OPTICAL_CHECK, SUB_GRADE, PROCESSING, NFC_INJECTION, COMPLETED, REJECTED
  courier_service: string;
  assigned_grader_id: string | null;
  created_at: string;
  card_name?: string;
  card_set?: string;
  tcg_category?: string;
}

export default function SubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTcg, setSelectedTcg] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("");
  const [selectedGraderFilter, setSelectedGraderFilter] = useState("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  // Modals Cetak Document
  const [selectedSubForInvoice, setSelectedSubForInvoice] = useState<any | null>(null);
  const [selectedSubForCertReport, setSelectedSubForCertReport] = useState<any | null>(null);

  const datePickerRef = useRef<HTMLInputElement | null>(null);
  const fpInstance = useRef<flatpickr.Instance | null>(null);

  // Ambil Data Submisi & Card Registry Pertama per Submisi
  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, staffRes, cardsRes] = await Promise.all([
        supabase.from("submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").in("role", ["SENIOR_GRADER", "OPERATOR", "ADMIN", "OWNER"]),
        supabase.from("card_registry").select("submission_id, card_name, set_name, tcg_type"),
      ]);

      if (staffRes.data) setStaffList(staffRes.data as UserProfile[]);

      if (subsRes.data) {
        const cardsMap: Record<string, { card_name: string; set_name: string; tcg_type: string }> = {};
        if (cardsRes.data) {
          cardsRes.data.forEach((c: any) => {
            if (!cardsMap[c.submission_id]) {
              cardsMap[c.submission_id] = {
                card_name: c.card_name,
                set_name: c.set_name,
                tcg_type: c.tcg_type,
              };
            }
          });
        }

        const formattedSubs: SubmissionRecord[] = subsRes.data.map((sub: any) => ({
          ...sub,
          card_name: cardsMap[sub.id]?.card_name || sub.card_name || "Kartu Koleksi",
          card_set: cardsMap[sub.id]?.set_name || sub.card_set || "Set Series",
          tcg_category: cardsMap[sub.id]?.tcg_type || sub.category_name || "POKEMON",
        }));

        setSubmissions(formattedSubs);
      }
    } catch (e) {
      console.error("Gagal memuat data submisi:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Staff Grader
  const availableGraders = useMemo(() => {
    return staffList.filter(
      (s) => s.role === "SENIOR_GRADER" || s.role === "OPERATOR" || s.role === "ADMIN" || s.role === "OWNER"
    );
  }, [staffList]);

  // Init Flatpickr
  useEffect(() => {
    if (datePickerRef.current) {
      fpInstance.current = flatpickr(datePickerRef.current, {
        mode: "range",
        dateFormat: "Y-m-d",
        onChange: (dates) => {
          if (dates.length === 2) setDateRange([dates[0], dates[1]]);
          else if (dates.length === 0) setDateRange([null, null]);
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

  // Direct Update Assigned Grader ke Database
  const handleGraderChange = async (submissionId: string, newGraderId: string) => {
    setSubmissions((prev) =>
      prev.map((sub) => (sub.id === submissionId ? { ...sub, assigned_grader_id: newGraderId || null } : sub))
    );

    try {
      const { error } = await supabase
        .from("submissions")
        .update({ assigned_grader_id: newGraderId || null })
        .eq("id", submissionId);

      if (error) throw error;
    } catch (err: any) {
      Swal.fire("Gagal!", err.message || "Gagal mengubah staff.", "error");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const targetSub = submissions.find((s) => s.id === id);
    if (!targetSub) return;

    const previousStatus = targetSub.status;
    if (previousStatus === newStatus) return;

    // Optimistic UI update
    setSubmissions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, status: newStatus } : sub))
    );

    try {
      // 1. Update status di tabel submissions
      const { error } = await supabase
        .from("submissions")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      const isBecomingCompleted = newStatus === "COMPLETED" && previousStatus !== "COMPLETED";
      const isRevertingFromCompleted = previousStatus === "COMPLETED" && newStatus !== "COMPLETED";

      // 2. Proses Mutasi Stok (Potong saat COMPLETED, Kembalikan saat batal COMPLETED)
      if ((isBecomingCompleted || isRevertingFromCompleted) && (targetSub as any).product_id) {
        const { data: recipes } = await supabase
          .from("product_recipes")
          .select(`
            quantity_required,
            lab_inventory (
              id,
              sku,
              name,
              current_stock,
              min_stock
            )
          `)
          .eq("product_id", (targetSub as any).product_id);

        if (recipes && recipes.length > 0) {
          const totalCards = Number(targetSub.total_cards) || 1;
          const summaryList: string[] = [];

          for (const r of recipes as any[]) {
            const inv = r.lab_inventory;
            if (!inv) continue;

            const qtyDelta = Number(r.quantity_required) * totalCards;

            // Jika COMPLETED -> Kurangi | Jika Batal COMPLETED -> Tambah kembali
            const newStock = isBecomingCompleted
              ? Math.max(0, Number(inv.current_stock) - qtyDelta)
              : Number(inv.current_stock) + qtyDelta;

            const newInvStatus = newStock <= Number(inv.min_stock) ? "Menipis" : "Aman";

            // Update stok di lab_inventory
            await supabase
              .from("lab_inventory")
              .update({
                current_stock: newStock,
                status: newInvStatus,
              })
              .eq("id", inv.id);

            // Catat riwayat ke stock_mutations
            await supabase.from("stock_mutations").insert({
              item_id: inv.id,
              item_sku: inv.sku,
              item_name: inv.name,
              type: isBecomingCompleted ? "OUT" : "IN",
              quantity: qtyDelta,
              reference_no: targetSub.order_no,
              notes: isBecomingCompleted
                ? `Auto-deduction submisi selesai (${totalCards} kartu)`
                : `Rollback stok otomatis — status batal dari Selesai & Kirim (${totalCards} kartu)`,
            });

            summaryList.push(`${isBecomingCompleted ? "-" : "+"}${qtyDelta} ${inv.name}`);
          }

          if (isBecomingCompleted) {
            Swal.fire({
              title: "Submisi Selesai!",
              text: `Status diubah menjadi Selesai & Kirim.`,
              icon: "success",
              confirmButtonColor: "#6366F1",
            });
          } else if (isRevertingFromCompleted) {
            Swal.fire({
              title: "Status Dikembalikan",
              text: `Stok bahan otomatis dikembalikan: ${summaryList.join(", ")}`,
              icon: "info",
              confirmButtonColor: "#6366F1",
            });
          }
          return;
        }
      }

      if (isBecomingCompleted) {
        Swal.fire({
          title: "Submisi Selesai!",
          text: "Status telah diubah menjadi Selesai & Kirim.",
          icon: "success",
          confirmButtonColor: "#6366F1",
        });
      }
    } catch (err: any) {
      // Rollback UI jika gagal simpan ke DB
      setSubmissions((prev) =>
        prev.map((sub) => (sub.id === id ? { ...sub, status: previousStatus } : sub))
      );
      Swal.fire("Gagal Menyimpan Status!", err.message || "Gagal mengubah status di database.", "error");
    }
  };

  // Delete submission
  const handleDelete = async (id: string, orderNo: string) => {
    const result = await Swal.fire({
      title: "Hapus Submisi?",
      text: `Apakah Anda yakin ingin menghapus submisi ${orderNo}? Data tidak dapat dipulihkan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await supabase.from("card_registry").delete().eq("submission_id", id);
        await supabase.from("submissions").delete().eq("id", id);
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        Swal.fire("Terhapus!", `Submisi ${orderNo} berhasil dihapus.`, "success");
      } catch (err: any) {
        Swal.fire("Gagal Hapus!", err.message, "error");
      }
    }
  };

  // Filter Logic
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchOrder = item.order_no.toLowerCase().includes(q);
        const matchName = item.collector_name.toLowerCase().includes(q);
        const matchCard = (item.card_name || "").toLowerCase().includes(q);
        if (!matchOrder && !matchName && !matchCard) return false;
      }

      if (selectedTcg && item.tcg_category !== selectedTcg) return false;
      if (selectedPaymentStatus && item.payment_status !== selectedPaymentStatus) return false;
      if (selectedCourier && !(item.courier_service || "").toLowerCase().includes(selectedCourier.toLowerCase())) return false;
      if (selectedGraderFilter && item.assigned_grader_id !== selectedGraderFilter) return false;

      if (dateRange[0] && dateRange[1]) {
        const itemDate = new Date(item.created_at);
        if (itemDate < dateRange[0] || itemDate > dateRange[1]) return false;
      }

      return true;
    });
  }, [submissions, searchQuery, selectedTcg, selectedPaymentStatus, selectedCourier, selectedGraderFilter, dateRange]);

  // Helper Helper Warna Dropdown Status (Sesuai Referensi Gambar UI)
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "PENDING_RECEIPT":
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
      case "OPTICAL_CHECK":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800";
      case "SUB_GRADE":
        return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800";
      case "PROCESSING":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800";
      case "NFC_INJECTION":
        return "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800";
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800";
      case "REJECTED":
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* 1. Header & Button Tambah Submisi */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            Alur Submisi &amp; Pemesanan Grading
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">
            Manajemen antrian kartu koleksi, penugasan grader, penilaian sub-grades, cetak invoice &amp; sertifikat.
          </p>
        </div>

        <Link
          href="/admin/submissions/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Submisi Kartu Baru
        </Link>
      </div>

      {/* 2. Metrics Cards */}
      <SubmissionMetricsCards submissions={submissions as any} loading={loading} />

      {/* 3. Filter Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Order No, Kolektor, atau Nama Kartu..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={datePickerRef}
              placeholder="Rentang Tanggal..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            />
          </div>

          <div>
            <select
              value={selectedTcg}
              onChange={(e) => setSelectedTcg(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="">Semua Kategori TCG</option>
              <option value="POKEMON">Pokémon</option>
              <option value="ONE_PIECE">One Piece</option>
              <option value="YUGIOH">Yu-Gi-Oh!</option>
              <option value="MTG">Magic: The Gathering</option>
              <option value="SPORTS">Sports Cards</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </div>
        </div>

        {/* Filter Baris Kedua */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1">Status Bayar</label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="">Semua Status Bayar</option>
              <option value="PAID">LUNAS (PAID)</option>
              <option value="DP">DP (Sebagian)</option>
              <option value="UNPAID">BELUM BAYAR (UNPAID)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1">Kurir Ekspedisi</label>
            <select
              value={selectedCourier}
              onChange={(e) => setSelectedCourier(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="">Semua Kurir</option>
              <option value="JNE">JNE</option>
              <option value="SiCepat">SiCepat</option>
              <option value="J&T">J&T Express</option>
              <option value="Paxel">Paxel</option>
              <option value="Drop-off">Drop-off Lab</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1">Assigned Grader</label>
            <select
              value={selectedGraderFilter}
              onChange={(e) => setSelectedGraderFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="">Semua Staff</option>
              {availableGraders.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedTcg("");
                setSelectedPaymentStatus("");
                setSelectedCourier("");
                setSelectedGraderFilter("");
                handleResetDate();
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* 4. Tabel Submisi */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-700 dark:text-gray-300">
            Ditemukan {filteredSubmissions.length} Data Submisi
          </span>
          <span className="text-[11px] text-gray-400">* Status &amp; Staff dapat diubah langsung di tabel</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-3">Order No &amp; Pemesan</th>
                <th className="py-3 px-3">Detail Kartu &amp; Set</th>
                <th className="py-3 px-3">Total Biaya &amp; Status Bayar</th>
                <th className="py-3 px-3">Workflow Status</th>
                <th className="py-3 px-3">Dikerjakan Oleh</th>
                <th className="py-3 px-3 text-center">Cetak Document</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">Memuat data submisi...</td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">Tidak ada data submisi ditemukan.</td>
                </tr>
              ) : (
                filteredSubmissions.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                      {/* Order No & Pemesan */}
                      <td className="py-3.5 px-3">
                        <div className="font-black text-gray-900 dark:text-white">{item.order_no}</div>
                        <div className="font-semibold text-gray-600 dark:text-gray-400">{item.collector_name}</div>
                      </td>

                      {/* Detail Kartu & Set */}
                      <td className="py-3.5 px-3 max-w-[220px]">
                        <div className="font-bold text-gray-900 dark:text-white truncate" title={item.card_name}>
                          {item.card_name}
                        </div>
                        <div className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold truncate">
                          {item.tcg_category} • {item.card_set}
                        </div>
                      </td>

                      {/* Total Biaya & Status Bayar */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-gray-900 dark:text-white">
                          Rp {(item.total_price || 0).toLocaleString("id-ID")}
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${item.payment_status === "PAID"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : item.payment_status === "DP"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                            }`}
                        >
                          {item.payment_status === "PAID" ? "LUNAS" : item.payment_status === "DP" ? "DP" : "UNPAID"}
                        </span>
                      </td>

                      {/* Workflow Status Dropdown dengan Beragam Warna */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <select
                          value={item.status || "PENDING_RECEIPT"}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer focus:outline-none transition-all ${getStatusColorClass(
                            item.status
                          )}`}
                        >
                          <option value="PENDING_RECEIPT">Dalam Daftar</option>
                          <option value="PROCESSING">Pengerjaan</option>
                          <option value="COMPLETED">Selesai &amp; Kirim</option>
                          <option value="REJECTED">Ditolak</option>
                        </select>
                      </td>

                      {/* Assigned Grader Dropdown Dinamis dari Database Profiles */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <select
                          value={item.assigned_grader_id || ""}
                          onChange={(e) => handleGraderChange(item.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="">Belum Ditugaskan</option>
                          {availableGraders.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.username}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Cetak Document */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedSubForInvoice(item)}
                            title="Cetak Invoice Submisi A4"
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-brand-600" />
                          </button>
                          <button
                            onClick={() => setSelectedSubForCertReport(item)}
                            title="Cetak Sertifikat Trifold Report"
                            className="p-1.5 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Aksi Navigasi Dedicated Page */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/submissions/${item.id}`}
                            title="Lihat Detail Submisi"
                            className="p-1.5 rounded-lg text-gray-600 hover:text-brand-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/admin/submissions/${item.id}/edit`}
                            title="Edit / Input Sub-Grades"
                            className="p-1.5 rounded-lg text-gray-600 hover:text-amber-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(item.id, item.order_no)}
                            title="Hapus Submisi"
                            className="p-1.5 rounded-lg text-gray-600 hover:text-rose-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CETAK INVOICE MODAL */}
      <SubmissionInvoiceModal
        submission={selectedSubForInvoice}
        isOpen={!!selectedSubForInvoice}
        onClose={() => setSelectedSubForInvoice(null)}
      />

      {/* CETAK TRIFOLD MODAL */}
      <SubmissionCertReportModal
        submission={selectedSubForCertReport}
        isOpen={!!selectedSubForCertReport}
        onClose={() => setSelectedSubForCertReport(null)}
      />
    </div>
  );
}