"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { InventoryItem } from "@/types/inventory";
import InventoryFormModal from "@/components/inventory/InventoryFormModal";
import { AlertTriangle } from "lucide-react";

interface StockSummary {
  name: string;
  category: string;
  totalIn: number;
  totalOut: number;
  remaining: number;
  latestItem: InventoryItem;
}

export default function InventoryPage() {
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
      text: `Hapus catatan transaksi ${itemName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
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

  // 1. KALKULASI RINGKASAN STOK (Group By Nama Barang)
  const stockSummaryList = useMemo(() => {
    const summaryMap: Record<string, StockSummary> = {};

    items.forEach((item) => {
      const key = item.item_name.trim();
      if (!summaryMap[key]) {
        summaryMap[key] = {
          name: key,
          category: item.category,
          totalIn: 0,
          totalOut: 0,
          remaining: 0,
          latestItem: item,
        };
      }
      summaryMap[key].totalIn += Number(item.stock_in || 0);
      summaryMap[key].totalOut += Number(item.stock_out || 0);
      summaryMap[key].remaining = summaryMap[key].totalIn - summaryMap[key].totalOut;
    });

    return Object.values(summaryMap);
  }, [items]);

  // 2. AMBIL 4 BARANG STOK PALING MENIPIS (Sorted Ascending)
  const topCriticalItems = useMemo(() => {
    return [...stockSummaryList]
      .sort((a, b) => a.remaining - b.remaining)
      .slice(0, 4);
  }, [stockSummaryList]);

  // 3. FILTER TABEL & URUTKAN BERDASARKAN ABJAD (A-Z)
  const filteredSummaryList = useMemo(() => {
    return stockSummaryList
      .filter((item) => {
        const matchCategory =
          selectedCategory === "Semua" || item.category === selectedCategory;
        const matchSearch = item.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" })); // URUT ABJAD A-Z
  }, [stockSummaryList, selectedCategory, searchQuery]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Tabel Stok Barang &amp; Material
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pantau ringkasan akumulasi stok dan kelola mutasi barang toko.
          </p>
        </div>
        <button
          onClick={() => {
            setItemToEdit(null);
            setIsFormOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors cursor-pointer"
        >
          + Catat Barang Masuk / Keluar
        </button>
      </div>

      {/* 4 CARD STOK PALING MENIPIS */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          4 Barang Stok Paling Menipis
        </h2>

        {topCriticalItems.length === 0 ? (
          <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-center text-xs text-gray-400">
            Belum ada data barang.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topCriticalItems.map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-medium truncate">
                      {item.category}
                    </span>
                    <span
                      className={`text-xs font-bold whitespace-nowrap ${item.remaining <= 5 ? "text-rose-500" : "text-emerald-500"
                        }`}
                    >
                      {item.remaining <= 5 ? "Stok Menipis" : "Tersedia"}
                    </span>
                  </div>

                  <h3
                    className="font-bold text-gray-800 dark:text-white text-base leading-snug line-clamp-2"
                    title={item.name}
                  >
                    {item.name}
                  </h3>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-baseline">
                  <span className="text-xs text-gray-400">Total Sisa:</span>
                  <span
                    className={`text-lg font-bold ${item.remaining <= 5 ? "text-rose-500" : "text-brand-600 dark:text-brand-400"
                      }`}
                  >
                    {item.remaining} Pcs
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FILTER & SEARCH BARS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4 dark:border-gray-800">
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-medium dark:bg-gray-800">
          {["Semua", "Bingkai", "Packaging", "Merchandise"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${selectedCategory === cat
                ? "bg-white text-gray-800 shadow-xs dark:bg-gray-700 dark:text-white font-bold"
                : "text-gray-500"
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
          className="w-full sm:w-64 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-xs outline-none focus:border-brand-500 dark:text-white"
        />
      </div>

      {/* TABEL TUNGGAL STOK BARANG & AKSI */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 border-gray-200 dark:border-gray-800 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Nama Barang</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium text-center">Total Masuk</th>
                <th className="px-4 py-3 font-medium text-center">Total Keluar</th>
                <th className="px-4 py-3 font-medium text-center">Stok Saat Ini</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
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
              ) : filteredSummaryList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    Tidak ada data barang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredSummaryList.map((item) => (
                  <tr key={item.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-emerald-600">
                      +{item.totalIn} Pcs
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-rose-600">
                      -{item.totalOut} Pcs
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-white">
                      {item.remaining} Pcs
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${item.remaining <= 5
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          }`}
                      >
                        {item.remaining <= 5 ? "Stok Menipis" : "Aman"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setItemToEdit(item.latestItem);
                            setIsFormOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.latestItem.id, item.name)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer"
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
        existingItems={items}
        onClose={() => {
          setIsFormOpen(false);
          setItemToEdit(null);
        }}
        onSuccess={fetchInventory}
      />
    </div>
  );
}