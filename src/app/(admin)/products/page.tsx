"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

// Tipe item gabungan untuk tampilan tabel
interface CombinedItem {
  id: string;
  name: string;
  price: number;
  item_type: "product" | "addon";
}

export default function ProductsPage() {
  const [items, setItems] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<CombinedItem | null>(null);

  // Form Inputs State
  const [formType, setFormType] = useState<"product" | "addon">("product");
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // 1. READ: Fetch Data dari tabel `products` & `add_ons`
  const fetchProductsAndAddons = async () => {
    setLoading(true);
    const [prodRes, addRes] = await Promise.all([
      supabase.from("products").select("id, name, price").order("name"),
      supabase.from("add_ons").select("id, name, price").order("name"),
    ]);

    const combinedList: CombinedItem[] = [];

    if (prodRes.data) {
      prodRes.data.forEach((p) => {
        combinedList.push({
          id: p.id,
          name: p.name,
          price: Number(p.price || 0),
          item_type: "product",
        });
      });
    }

    if (addRes.data) {
      addRes.data.forEach((a) => {
        combinedList.push({
          id: a.id,
          name: a.name,
          price: Number(a.price || 0),
          item_type: "addon",
        });
      });
    }

    setItems(combinedList);
    setLoading(false);
  };

  useEffect(() => {
    fetchProductsAndAddons();
  }, []);

  // 2. DELETE: Hapus Item dari Supabase
  const handleDelete = async (id: string, name: string, itemType: "product" | "addon") => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah kamu yakin ingin menghapus "${name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const targetTable = itemType === "product" ? "products" : "add_ons";
      const { error } = await supabase.from(targetTable).delete().eq("id", id);

      if (error) {
        Swal.fire("Error!", "Gagal menghapus: " + error.message, "error");
      } else {
        Swal.fire("Terhapus!", "Data berhasil dihapus.", "success");
        fetchProductsAndAddons();
      }
    }
  };

  // Open Form (Tambah vs Edit)
  const handleOpenForm = (item?: CombinedItem | null) => {
    if (item) {
      setItemToEdit(item);
      setFormType(item.item_type);
      setFormName(item.name);
      setFormPrice(item.price);
    } else {
      setItemToEdit(null);
      setFormType("product");
      setFormName("");
      setFormPrice(0);
    }
    setIsFormOpen(true);
  };

  // 3 & 4. CREATE & UPDATE: Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      Swal.fire("Peringatan", "Nama item wajib diisi!", "warning");
      return;
    }

    setSubmitting(true);
    let error = null;

    if (formType === "product") {
      const payload = {
        name: formName.trim(),
        price: Number(formPrice),
      };

      if (itemToEdit) {
        const res = await supabase.from("products").update(payload).eq("id", itemToEdit.id);
        error = res.error;
      } else {
        const res = await supabase.from("products").insert([payload]);
        error = res.error;
      }
    } else {
      const payload = {
        name: formName.trim(),
        price: Number(formPrice),
      };

      if (itemToEdit) {
        const res = await supabase.from("add_ons").update(payload).eq("id", itemToEdit.id);
        error = res.error;
      } else {
        const res = await supabase.from("add_ons").insert([payload]);
        error = res.error;
      }
    }

    setSubmitting(false);

    if (error) {
      Swal.fire("Error!", "Gagal menyimpan data: " + error.message, "error");
    } else {
      Swal.fire("Berhasil!", itemToEdit ? "Data berhasil diperbarui." : "Data baru ditambahkan.", "success");
      setIsFormOpen(false);
      fetchProductsAndAddons();
    }
  };

  // Kalkulasi Summary Cards
  const summaryData = useMemo(() => {
    const totalProducts = items.filter((i) => i.item_type === "product").length;
    const totalAddons = items.filter((i) => i.item_type === "addon").length;

    return { totalProducts, totalAddons };
  }, [items]);

  // Filter List (Berdasarkan Tab Filter & Search Input)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchType =
        selectedType === "Semua" ||
        (selectedType === "Produk Frame" && item.item_type === "product") ||
        (selectedType === "Tambahan / Add-ons" && item.item_type === "addon");

      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchType && matchSearch;
    });
  }, [items, selectedType, searchQuery]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Katalog Produk &amp; Add-ons
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kelola daftar varian frame produk dan item tambahan beserta harganya.
          </p>
        </div>
        <button
          onClick={() => handleOpenForm(null)}
          className="px-4 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
        >
          + Tambah Produk / Add-on
        </button>
      </div>

      {/* FILTER BUTTONS & SEARCH INPUT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4 dark:border-gray-800">
        <div className="flex gap-2">
          {["Semua", "Produk Frame", "Tambahan / Add-ons"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedType(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${selectedType === tab
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Cari nama produk / add-on..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
        />
      </div>

      {/* TABEL KATALOG & ADD-ONS */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 border-gray-200 dark:border-gray-800 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Tipe Item</th>
                <th className="px-4 py-3 font-medium">Nama Produk / Item</th>
                <th className="px-4 py-3 font-medium text-right">Harga Satuan</th>
                <th className="px-4 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-6">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-500">
                    Belum ada data produk atau add-on.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 text-xs">
                      {item.item_type === "product" ? (
                        <span className="px-2.5 py-0.5 font-semibold rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          Frame Produk
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 font-semibold rounded-full bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                          Add-on / Extra
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      Rp {item.price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenForm(item)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name, item.item_type)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM CREATE / EDIT */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl space-y-4 text-gray-800 dark:text-white">
            <h3 className="font-bold text-lg">
              {itemToEdit ? "Edit Item Katalog" : "Tambah Item Baru"}
            </h3>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Tipe Item *</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as "product" | "addon")}
                  disabled={!!itemToEdit}
                  className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="product">Produk Frame (Masuk ke tabel products)</option>
                  <option value="addon">Item Add-on (Masuk ke tabel add_ons)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">
                  {formType === "product" ? "Nama Produk (Jenis & Ukuran) *" : "Nama Item Add-on *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={formType === "product" ? "Contoh: Frame Pakai Kaca A4 (20x30cm)" : "Contoh: Stiker Nama Custom"}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Harga Satuan (Rp) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700 font-bold text-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}