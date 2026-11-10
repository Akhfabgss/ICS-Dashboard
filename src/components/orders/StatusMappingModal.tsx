"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { OrderStatus, StatusMapping } from "@/types/order";
import { UserProfile } from "@/types/users";
import Swal from "sweetalert2";

interface StatusMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: UserProfile[];
  onMappingsUpdated: () => void;
}

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "Dalam Daftar",
  "Pending",
  "Proses Design",
  "Pengerjaan",
  "Pengiriman",
  "Selesai",
  "Trouble",
];

export default function StatusMappingModal({
  isOpen,
  onClose,
  staffList,
  onMappingsUpdated,
}: StatusMappingModalProps) {
  const [mappings, setMappings] = useState<StatusMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states (Hanya Staf & Status Otomatis)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [targetStatus, setTargetStatus] = useState<OrderStatus>("Proses Design");

  const fetchMappings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("status_mappings")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMappings(data as StatusMapping[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchMappings();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setSelectedUserId(staffList.length > 0 ? staffList[0].id : "");
    setTargetStatus("Proses Design");
  };

  const handleStartEdit = (mapping: StatusMapping) => {
    setEditingId(mapping.id);
    setSelectedUserId(mapping.user_id || "");
    setTargetStatus(mapping.target_status);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!selectedUserId) {
        Swal.fire("Peringatan", "Pilih staf terlebih dahulu!", "warning");
        setSubmitting(false);
        return;
      }

      // Cek apakah staf ini sudah memiliki aturan (kecuali sedang diedit aturan yang sama)
      const existing = mappings.find(
        (m) => m.user_id === selectedUserId && m.id !== editingId
      );
      if (existing) {
        const staffObj = staffList.find((s) => s.id === selectedUserId);
        Swal.fire(
          "Aturan Sudah Ada",
          `Staf ${staffObj?.full_name || "ini"} sudah memiliki aturan status (${existing.target_status}). Silakan edit aturan yang sudah ada jika ingin mengubahnya.`,
          "info"
        );
        setSubmitting(false);
        return;
      }

      const payload = {
        user_id: selectedUserId,
        target_status: targetStatus,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("status_mappings")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Aturan staf berhasil diperbarui!",
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        const { error } = await supabase
          .from("status_mappings")
          .insert([payload]);

        if (error) throw error;

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Aturan staf berhasil ditambahkan!",
          showConfirmButton: false,
          timer: 2000,
        });
      }

      resetForm();
      await fetchMappings();
      onMappingsUpdated();
    } catch (err: any) {
      Swal.fire("Error!", "Gagal menyimpan aturan: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, staffName: string) => {
    const result = await Swal.fire({
      title: "Hapus Aturan?",
      text: `Hapus aturan relasi status otomatis untuk staf "${staffName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const { error } = await supabase
        .from("status_mappings")
        .delete()
        .eq("id", id);

      if (error) {
        Swal.fire("Error!", "Gagal menghapus aturan: " + error.message, "error");
      } else {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Aturan berhasil dihapus!",
          showConfirmButton: false,
          timer: 2000,
        });
        await fetchMappings();
        onMappingsUpdated();
      }
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "Dalam Daftar":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white";
      case "Pending":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "Proses Design":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "Pengerjaan":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Pengiriman":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "Selesai":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Trouble":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Pengaturan Relasi Staf &amp; Status
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Atur status pesanan yang otomatis terpilih ketika pesanan ditugaskan ke staf tertentu.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* TABEL ATURAN SAAT INI */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">
              Daftar Relasi Staf Aktif ({mappings.length})
            </h3>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nama Staf</th>
                    <th className="px-4 py-3 font-semibold">Status Pesanan Otomatis</th>
                    <th className="px-4 py-3 font-semibold text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-gray-500">
                        Memuat data aturan...
                      </td>
                    </tr>
                  ) : mappings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-gray-500">
                        Belum ada pemetaan staf. Silakan tambahkan aturan di form bawah.
                      </td>
                    </tr>
                  ) : (
                    mappings.map((mapping) => {
                      const staff = staffList.find((s) => s.id === mapping.user_id);
                      const staffName = staff?.full_name || staff?.email || "Staf (" + mapping.user_id + ")";

                      return (
                        <tr
                          key={mapping.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="px-4 py-3.5 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                            <span className="font-semibold">{staffName}</span>
                            {staff?.role && (
                              <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                {staff.role}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${getStatusBadge(
                                mapping.target_status
                              )}`}
                            >
                              {mapping.target_status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleStartEdit(mapping)}
                                className="px-2.5 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(mapping.id, staffName)}
                                className="px-2.5 py-1 text-xs rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                              >
                                Hapus
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

          {/* FORM TAMBAH / EDIT ATURAN */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-800/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                {editingId ? "✏️ Edit Relasi Staf" : "➕ Tambah Relasi Staf Baru"}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-rose-500 hover:underline cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pilih Staf */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Pilih Staf *
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
                  >
                    <option value="" disabled>
                      -- Pilih Staf --
                    </option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Pesanan Otomatis */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Status Pesanan Otomatis *
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
                    required
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-brand-500"
                  >
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-1">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? "Menyimpan..."
                    : editingId
                      ? "Simpan Perubahan"
                      : "+ Simpan Aturan Staf"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* FOOTER */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
