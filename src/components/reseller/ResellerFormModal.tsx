"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { ResellerOrder, ResellerStatus } from "@/types/reseller";
import { X } from "lucide-react";

interface ProductOption {
  id: string;
  name: string;
}

interface ResellerFormModalProps {
  isOpen: boolean;
  itemToEdit: ResellerOrder | null;
  onClose: () => void;
  onSuccess: () => void;
  isFinanceVisible: boolean;
}

export default function ResellerFormModal({
  isOpen,
  itemToEdit,
  onClose,
  onSuccess,
  isFinanceVisible,
}: ResellerFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [productList, setProductList] = useState<ProductOption[]>([]);

  // Form States
  const [orderDate, setOrderDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [resellerName, setResellerName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [frameType, setFrameType] = useState("");
  const [orderSource, setOrderSource] = useState("WhatsApp");
  const [commission, setCommission] = useState<number>(0);
  const [status, setStatus] = useState<ResellerStatus>("Dalam Daftar");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name")
        .order("name");
      if (data) setProductList(data as ProductOption[]);
    };
    if (isOpen) fetchProducts();
  }, [isOpen]);

  useEffect(() => {
    if (itemToEdit) {
      setOrderDate(itemToEdit.order_date || new Date().toISOString().split("T")[0]);
      setCompletionDate(itemToEdit.completion_date || "");
      setResellerName(itemToEdit.reseller_name || "");
      setCustomerName(itemToEdit.customer_name || "");
      setFrameType(itemToEdit.frame_type || "");
      setOrderSource(itemToEdit.order_source || "WhatsApp");
      setCommission(Number(itemToEdit.commission || 0));
      setStatus(itemToEdit.status || "Dalam Daftar");
      setNotes(itemToEdit.notes || "");
    } else {
      setOrderDate(new Date().toISOString().split("T")[0]);
      setCompletionDate("");
      setResellerName("");
      setCustomerName("");
      setFrameType("");
      setOrderSource("WhatsApp");
      setCommission(0);
      setStatus("Dalam Daftar");
      setNotes("");
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      order_date: orderDate,
      completion_date: completionDate || null,
      reseller_name: resellerName.trim(),
      customer_name: customerName.trim(),
      frame_type: frameType,
      order_source: orderSource,
      status,
      notes: notes.trim(),
    };

    if (isFinanceVisible) {
      payload.commission = commission;
    }

    let error = null;

    if (itemToEdit) {
      const { error: err } = await supabase
        .from("resellers")
        .update(payload)
        .eq("id", itemToEdit.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("resellers").insert([payload]);
      error = err;
    }

    setSubmitting(false);

    if (error) {
      Swal.fire("Error", "Gagal menyimpan data reseller: " + error.message, "error");
    } else {
      Swal.fire(
        "Berhasil!",
        `Data order reseller berhasil ${itemToEdit ? "diperbarui" : "dicatat"}.`,
        "success"
      );
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-lg text-gray-800 dark:text-white">
            {itemToEdit ? "Edit Order Reseller" : "+ Tambah Order Reseller"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1 dark:text-gray-200">Tgl Pemesanan *</label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-2.5 outline-none focus:border-brand-500 cursor-pointer dark:text-white dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1 dark:text-gray-200">Tgl Pengerjaan</label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-2.5 outline-none focus:border-brand-500 cursor-pointer dark:text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1 dark:text-gray-200">Nama Reseller *</label>
              <input
                type="text"
                required
                placeholder="misal: Ibnu"
                value={resellerName}
                onChange={(e) => setResellerName(e.target.value)}
                className="w-full rounded-xl border dark:text-gray-200 border-gray-300 dark:border-gray-700 bg-transparent p-2.5 outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-medium mb-1 dark:text-gray-200">Nama Customer *</label>
              <input
                type="text"
                required
                placeholder="misal: Ahmad Adi Irawan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border dark:text-gray-200 border-gray-300 dark:border-gray-700 bg-transparent p-2.5 outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1 dark:text-gray-200">Order Lewat *</label>
              <select
                value={orderSource}
                onChange={(e) => setOrderSource(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 p-2.5 text-gray-900 dark:text-white outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Instagram">Instagram</option>
                <option value="Shopee">Shopee</option>
                <option value="Tokopedia">Tokopedia</option>
                <option value="TikTok Shop">TikTok Shop</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1 dark:text-gray-200">Pilih Tipe Bingkai (Produk) *</label>
              <select
                required
                value={frameType}
                onChange={(e) => setFrameType(e.target.value)}
                className="w-full rounded-xl border dark:text-gray-200 border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 p-2.5 outline-none focus:border-brand-500 font-medium cursor-pointer"
              >
                <option value="">— Pilih Produk Bingkai —</option>
                {productList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isFinanceVisible && (
              <div>
                <label className="block font-medium mb-1 dark:text-gray-200">Komisi (Rp)</label>
                <input
                  type="number"
                  value={commission}
                  onChange={(e) => setCommission(Number(e.target.value))}
                  placeholder="12000"
                  className="w-full rounded-xl border dark:text-gray-200 border-gray-300 dark:border-gray-700 bg-transparent p-2.5 font-bold text-brand-600 dark:text-brand-400 outline-none focus:border-brand-500"
                />
              </div>
            )}

            <div className={isFinanceVisible ? "" : "sm:col-span-2"}>
              <label className="block font-medium mb-1 dark:text-gray-200">Status Pesanan</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ResellerStatus)}
                className="w-full rounded-xl border dark:text-gray-200 border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 p-2.5 outline-none focus:border-brand-500 font-medium cursor-pointer"
              >
                <option value="Dalam Daftar">Dalam Daftar</option>
                <option value="Pending">Pending</option>
                <option value="Proses Design">Proses Design</option>
                <option value="Pengerjaan">Pengerjaan</option>
                <option value="Pengiriman">Pengiriman</option>
                <option value="Selesai">Selesai</option>
                <option value="Trouble">Trouble</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1 dark:text-gray-200">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan pengerjaan / pengiriman..."
              className="w-full rounded-xl border dark:text-gray-200 border-gray-300 dark:border-gray-700 bg-transparent p-2.5 outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border dark:text-gray-200 border-gray-300 dark:border-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}