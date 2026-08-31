"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { InventoryItem } from "@/types/inventory";

interface ModalProps {
  isOpen: boolean;
  itemToEdit?: InventoryItem | null;
  existingItems?: InventoryItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function InventoryFormModal({
  isOpen,
  itemToEdit,
  existingItems = [],
  onClose,
  onSuccess,
}: ModalProps) {
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<"Bingkai" | "Packing" | "Merchandise">("Bingkai");
  const [vendor, setVendor] = useState("");
  const [stockIn, setStockIn] = useState<number>(0);
  const [stockOut, setStockOut] = useState<number>(0);

  // Ambil daftar nama barang unik untuk auto-suggest
  const uniqueItemNames = Array.from(new Set(existingItems.map((i) => i.item_name.trim())));

  useEffect(() => {
    if (itemToEdit) {
      setDate(itemToEdit.date || new Date().toISOString().split("T")[0]);
      setItemName(itemToEdit.item_name || "");
      setCategory(itemToEdit.category || "Bingkai");
      setVendor(itemToEdit.vendor || "");
      setStockIn(itemToEdit.stock_in || 0);
      setStockOut(itemToEdit.stock_out || 0);
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setItemName("");
      setCategory("Bingkai");
      setVendor("");
      setStockIn(0);
      setStockOut(0);
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      date,
      item_name: itemName.trim(),
      category,
      vendor,
      stock_in: stockIn,
      stock_out: stockOut,
    };

    let error;
    if (itemToEdit) {
      const res = await supabase.from("inventory").update(payload).eq("id", itemToEdit.id);
      error = res.error;
    } else {
      const res = await supabase.from("inventory").insert([payload]);
      error = res.error;
    }

    setLoading(false);

    if (error) {
      Swal.fire("Error!", "Terjadi kesalahan: " + error.message, "error");
    } else {
      Swal.fire("Berhasil!", itemToEdit ? "Catatan stok berhasil diperbarui." : "Catatan stok berhasil ditambahkan.", "success");
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800 text-gray-800 dark:text-white">
        <h2 className="text-xl font-bold mb-4">
          {itemToEdit ? "Edit Catatan Stok" : "Catat Barang Masuk / Keluar"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Tanggal *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Kategori *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="Bingkai">Bingkai</option>
                <option value="Packing">Packing</option>
                <option value="Merchandise">Merchandise</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Nama Barang *</label>
            <input
              type="text"
              required
              list="item-suggestions"
              placeholder="Ketik atau pilih nama barang..."
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700"
            />
            {/* Auto Suggestion Datalist */}
            <datalist id="item-suggestions">
              {uniqueItemNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block font-medium mb-1">Vendor / Supplier</label>
            <input
              type="text"
              placeholder="Contoh: Raja Dekor / PT Kayu Jaya"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700"
            />
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Jumlah Masuk (Pcs)</label>
                <input
                  type="number"
                  min="0"
                  value={stockIn}
                  onChange={(e) => setStockIn(Number(e.target.value))}
                  className="w-full rounded-lg border p-2 bg-transparent dark:border-gray-700 text-emerald-600 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Jumlah Keluar (Pcs)</label>
                <input
                  type="number"
                  min="0"
                  value={stockOut}
                  onChange={(e) => setStockOut(Number(e.target.value))}
                  className="w-full rounded-lg border p-2 bg-transparent dark:border-gray-700 text-rose-600 font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Log Stok"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}