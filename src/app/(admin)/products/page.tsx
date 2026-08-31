"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { InventoryItem } from "@/types/inventory";
import InventoryFormModal from "@/components/inventory/InventoryFormModal";

export default function ProductsPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setItems(data as InventoryItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleDelete = async (id: string, itemName: string) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Hapus catatan riwayat ${itemName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      const { data, error } = await supabase.from("inventory").delete().eq("id", id).select();
      if (error) {
        Swal.fire("Error!", "Gagal menghapus: " + error.message, "error");
      } else if (!data || data.length === 0) {
        Swal.fire("Error!", "Gagal menghapus! Cek RLS DELETE policy di Supabase.", "error");
      } else {
        Swal.fire("Terhapus!", "Data berhasil dihapus.", "success");
        fetchInventory();
      }
    }
  };

  // 1. KALKULASI RINGKASAN TOTAL STOK (Group By Nama Barang & Kategori)
  const stockSummary = useMemo(() => {
    const summaryMap: Record<
      string,
      { category: string; totalIn: number; totalOut: number; remaining: number }
    > = {};

    items.forEach((item) => {
      // Normalisasi nama barang (case insensitive)
      const key = item.item_name.trim();
      if (!summaryMap[key]) {
        summaryMap[key] = {
          category: item.category,
          totalIn: 0,
          totalOut: 0,
          remaining: 0,
        };
      }
      summaryMap[key].totalIn += Number(item.stock_in || 0);
      summaryMap[key].totalOut += Number(item.stock_out || 0);
      summaryMap[key].remaining = summaryMap[key].totalIn - summaryMap[key].totalOut;
    });

    return summaryMap;
  }, [items]);

  // Filter Riwayat berdasarkan Kategori & Search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory =
        selectedCategory === "Semua" || item.category === selectedCategory;
      const matchSearch = item.item_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Tabel Stok Barang &amp; Material
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pantau ringkasan akumulasi stok dan riwayat mutasi barang toko.
          </p>
        </div>
        <button
          onClick={() => {
            setItemToEdit(null);
            setIsFormOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
        >
          + Catat Barang Masuk / Keluar
        </button>
      </div>

      {/* 2. RINGKASAN AKUMULASI STOK AKTUAL (SUMMARY CARDS) */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
          Ringkasan Total Stok Barang Saat Ini
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.keys(stockSummary).length === 0 ? (
            <div className="col-span-full p-4 bg-white dark:bg-gray-900 border rounded-xl text-center text-xs text-gray-400">
              Belum ada data barang.
            </div>
          ) : (
            Object.entries(stockSummary).map(([itemName, data]) => (
              <div
                key={itemName}
                className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-medium">
                    {data.category}
                  </span>
                  <span
                    className={`text-xs font-bold ${data.remaining <= 5 ? "text-rose-500" : "text-emerald-500"
                      }`}
                  >
                    {data.remaining <= 5 ? "Stok Menipis" : "Tersedia"}
                  </span>
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white text-base">
                  {itemName}
                </h3>
                <div className="pt-2 border-t dark:border-gray-800 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Total Sisa:</span>
                  <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                    {data.remaining} Pcs
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. FILTER & SEARCH BARS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4 dark:border-gray-800">
        <div className="flex gap-2">
          {["Semua", "Bingkai", "Packing", "Merchandise"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${selectedCategory === cat
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Cari nama barang..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
        />
      </div>

      {/* 4. TABEL RIWAYAT MUTASI MASUK / KELUAR */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-bold text-sm text-gray-800 dark:text-white">
            Riwayat Transaksi Barang
          </h2>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 border-gray-200 dark:border-gray-800 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Nama Barang</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium text-center">Masuk</th>
                <th className="px-4 py-3 font-medium text-center">Keluar</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-6">
                    Memuat data stok...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    Belum ada catatan transaksi barang.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(item.date).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">
                      {item.item_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-emerald-600">
                      {item.stock_in > 0 ? `+${item.stock_in}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-rose-600">
                      {item.stock_out > 0 ? `-${item.stock_out}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {item.vendor || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setItemToEdit(item);
                            setIsFormOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.item_name)}
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

      <InventoryFormModal
        isOpen={isFormOpen}
        itemToEdit={itemToEdit}
        existingItems={items} // Meneruskan daftar barang untuk dropdown auto-suggest
        onClose={() => {
          setIsFormOpen(false);
          setItemToEdit(null);
        }}
        onSuccess={fetchInventory}
      />
    </div>
  );
}