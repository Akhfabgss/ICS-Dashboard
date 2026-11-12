"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { LabInventoryItem, StockMutation } from "@/types/inventory";
import {
  Boxes,
  CheckCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  ArrowDownRight,
  ArrowUpLeft,
  ExternalLink,
  PackagePlus,
  Trash2,
  Edit2,
} from "lucide-react";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<LabInventoryItem[]>([]);
  const [mutations, setMutations] = useState<StockMutation[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter Search
  const [searchQuery, setSearchQuery] = useState("");

  // Restock Modal
  const [selectedItemForRestock, setSelectedItemForRestock] = useState<LabInventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(50);
  const [restockNotes, setRestockNotes] = useState("");
  const [vendorInput, setVendorInput] = useState("");

  // Modal State Tambah Bahan Lab Baru
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newVendor, setNewVendor] = useState("");
  const [newInitialStock, setNewInitialStock] = useState<number>(100);
  const [newMinStock, setNewMinStock] = useState<number>(20);
  const [newUnitCost, setNewUnitCost] = useState<number>(35000);

  // Modal State Edit Item (Koreksi Qty / Detail)
  const [editingItem, setEditingItem] = useState<LabInventoryItem | null>(null);
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editVendor, setEditVendor] = useState("");
  const [editStock, setEditStock] = useState<number>(0);
  const [editMinStock, setEditMinStock] = useState<number>(0);
  const [editUnitCost, setEditUnitCost] = useState<number>(0);
  const [editReason, setEditReason] = useState("");

  // 1. Ambil Data Real-time dari Supabase
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data: invData, error: invErr } = await supabase
        .from("lab_inventory")
        .select("*")
        .order("sku", { ascending: true });

      if (!invErr && invData) {
        setInventory(invData as LabInventoryItem[]);
      }

      const { data: mutData, error: mutErr } = await supabase
        .from("stock_mutations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!mutErr && mutData) {
        setMutations(mutData as StockMutation[]);
      }
    } catch (e) {
      console.error("Gagal mengambil data inventory:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // 2. Open Modal Edit Item
  const handleOpenEditModal = (item: LabInventoryItem) => {
    setEditingItem(item);
    setEditSku(item.sku);
    setEditName(item.name);
    setEditVendor(item.vendor || "");
    setEditStock(item.current_stock);
    setEditMinStock(item.min_stock);
    setEditUnitCost(item.unit_cost);
    setEditReason("Koreksi / Penyesuaian manual stok");
  };

  // 3. Simpan Perubahan Edit Item & Koreksi Qty
  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const newStockNum = Number(editStock);
    const minStockNum = Number(editMinStock);
    const oldStock = editingItem.current_stock;
    const diff = newStockNum - oldStock;
    const updatedStatus = newStockNum <= minStockNum ? "Menipis" : "Aman";

    try {
      const { error: updateErr } = await supabase
        .from("lab_inventory")
        .update({
          sku: editSku.toUpperCase().trim(),
          name: editName.trim(),
          vendor: editVendor.trim(),
          current_stock: newStockNum,
          min_stock: minStockNum,
          unit_cost: Number(editUnitCost),
          status: updatedStatus,
        })
        .eq("id", editingItem.id);

      if (updateErr) throw updateErr;

      // Catat log penyesuaian jika ada perubahan Qty
      if (diff !== 0) {
        await supabase.from("stock_mutations").insert({
          item_id: editingItem.id,
          item_sku: editSku.toUpperCase().trim(),
          item_name: editName.trim(),
          type: diff > 0 ? "IN" : "OUT",
          quantity: Math.abs(diff),
          reference_no: "ADJUSTMENT",
          notes: editReason || `Koreksi stok dari ${oldStock} ke ${newStockNum}`,
        });
      }

      Swal.fire("Perubahan Disimpan!", `Data ${editName} berhasil diperbarui.`, "success");
      setEditingItem(null);
      fetchInventory();
    } catch (err: any) {
      Swal.fire("Gagal Update!", err.message || "Terjadi kesalahan database.", "error");
    }
  };

  // 4. Tambah Bahan Lab Baru
  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.trim() || !newName.trim()) return;

    const initialStockNum = Number(newInitialStock);
    const minStockNum = Number(newMinStock);
    const calculatedStatus = initialStockNum <= minStockNum ? "Menipis" : "Aman";

    try {
      const { data, error } = await supabase
        .from("lab_inventory")
        .insert({
          sku: newSku.toUpperCase().trim(),
          name: newName.trim(),
          vendor: newVendor.trim(),
          current_stock: initialStockNum,
          min_stock: minStockNum,
          unit_cost: Number(newUnitCost),
          status: calculatedStatus,
        })
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        if (initialStockNum > 0) {
          await supabase.from("stock_mutations").insert({
            item_id: data.id,
            item_sku: data.sku,
            item_name: data.name,
            type: "IN",
            quantity: initialStockNum,
            reference_no: "INITIAL-STOCK",
            notes: "Stok awal pendaftaran bahan lab baru",
          });
        }

        Swal.fire("Bahan Berhasil Ditambahkan!", `SKU ${data.sku} tersimpan di Supabase.`, "success");
        setIsNewItemModalOpen(false);

        setNewSku("");
        setNewName("");
        setNewVendor("");
        setNewInitialStock(100);
        setNewMinStock(20);
        setNewUnitCost(35000);

        fetchInventory();
      }
    } catch (err: any) {
      Swal.fire("Gagal Menambah Bahan!", err.message || "Periksa izin RLS Supabase Anda.", "error");
    }
  };

  // 5. Restock Stok Masuk Quick Button
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForRestock) return;

    const qty = Number(restockQty);
    const updatedCurrentStock = Number(selectedItemForRestock.current_stock || 0) + qty;
    const updatedStatus = updatedCurrentStock <= selectedItemForRestock.min_stock ? "Menipis" : "Aman";

    const { error: invErr } = await supabase
      .from("lab_inventory")
      .update({
        current_stock: updatedCurrentStock,
        status: updatedStatus,
        vendor: vendorInput,
      })
      .eq("id", selectedItemForRestock.id);

    if (invErr) {
      Swal.fire("Gagal Restock!", invErr.message, "error");
      return;
    }

    if (qty > 0) {
      await supabase.from("stock_mutations").insert({
        item_id: selectedItemForRestock.id,
        item_sku: selectedItemForRestock.sku,
        item_name: selectedItemForRestock.name,
        type: "IN",
        quantity: qty,
        reference_no: `RESTOCK-${Math.floor(100 + Math.random() * 900)}`,
        notes: restockNotes || `Restock dari vendor: ${vendorInput || "Pengadaan Lab"}`,
      });
    }

    Swal.fire("Berhasil Restock!", `Stok ${selectedItemForRestock.name} telah diperbarui.`, "success");
    fetchInventory();
    setSelectedItemForRestock(null);
  };

  // 6. Hapus Bahan Lab
  const handleDeleteItem = async (id: string, name: string) => {
    const res = await Swal.fire({
      title: "Hapus Bahan Lab?",
      text: `Hapus komponen "${name}" dari inventaris?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (res.isConfirmed) {
      const { error } = await supabase.from("lab_inventory").delete().eq("id", id);
      if (!error) {
        Swal.fire("Terhapus!", "Komponen bahan lab telah dihapus.", "success");
        fetchInventory();
      } else {
        Swal.fire("Gagal Hapus!", error.message, "error");
      }
    }
  };

  const metrics = useMemo(() => {
    const total = inventory.length;
    const safe = inventory.filter((i) => i.current_stock > i.min_stock).length;
    const critical = inventory.filter((i) => i.current_stock <= i.min_stock).length;
    return { total, safe, critical };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.name || "").toLowerCase().includes(q);
        const matchSku = (item.sku || "").toLowerCase().includes(q);
        const matchVendor = (item.vendor || "").toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchVendor) return false;
      }
      return true;
    });
  }, [inventory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-brand-600" />
            Stok Komponen &amp; Bahan Lab
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Monitoring stok slab shell, chip RFID NTAG215, hologram tamper-proof, serta link vendor re-order.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            Tambah Bahan Lab Baru
          </button>

          <button
            onClick={fetchInventory}
            title="Sinkronkan Data"
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. CARDS RINGKASAN */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400">
              Total Komponen Lab
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-black text-gray-900 dark:text-white">
            {metrics.total} SKU Terdaftar
          </h3>
          <p className="mt-1 text-xs text-gray-400">Daftar material operasional lab</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400">
              Item Stok Aman (&gt; Batas Min)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.safe} Item Aman
          </h3>
          <p className="mt-1 text-xs text-gray-400">Pasokan mencukupi untuk grading aktif</p>
        </div>

        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-5 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-rose-600 dark:text-rose-400">
              Item Kritis (&lt;= Batas Min)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-black text-rose-600 dark:text-rose-400">
            {metrics.critical} Item Menipis
          </h3>
          <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">
            Stok berada di bawah threshold batas minimum
          </p>
        </div>
      </div>

      {/* 3. TABEL INVENTARIS BAHAN LAB */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari SKU, nama bahan lab, atau vendor..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400 tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-3">SKU Bahan</th>
                <th className="py-3 px-3">Nama Komponen / Bahan Lab</th>
                <th className="py-3 px-3">Vendor / Supplier (Link Re-order)</th>
                <th className="py-3 px-3 text-center">Qty Saat Ini</th>
                <th className="py-3 px-3 text-center">Batas Min</th>
                <th className="py-3 px-3 text-right">Unit HPP (Rp)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    Memuat inventaris bahan lab...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center space-y-3">
                    <p className="text-gray-400 text-xs">Belum ada bahan lab terdaftar di Supabase.</p>
                    <button
                      onClick={() => setIsNewItemModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs cursor-pointer"
                    >
                      <PackagePlus className="w-4 h-4" />
                      Tambah Bahan Pertama Sekarang
                    </button>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isUrl = item.vendor?.startsWith("http://") || item.vendor?.startsWith("https://");

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-3 font-mono font-bold text-brand-600 dark:text-brand-400">
                        {item.sku}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-gray-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-3 max-w-[220px]">
                        {item.vendor ? (
                          isUrl ? (
                            <a
                              href={item.vendor}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 truncate"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{item.vendor}</span>
                            </a>
                          ) : (
                            <span className="font-semibold text-gray-700 dark:text-gray-300 truncate block">
                              {item.vendor}
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">- Opsional -</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`text-sm font-black ${item.current_stock <= item.min_stock
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-gray-900 dark:text-white"
                            }`}
                        >
                          {item.current_stock}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center text-gray-500 font-semibold">
                        {item.min_stock}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-gray-800 dark:text-gray-200">
                        Rp {Number(item.unit_cost || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.status === "Aman"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : item.status === "Menipis"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 animate-pulse"
                                : "bg-gray-200 text-gray-700"
                            }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedItemForRestock(item);
                              setRestockQty(50);
                              setVendorInput(item.vendor || "");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 font-semibold text-xs transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Restock
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit & Koreksi Qty"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            title="Hapus Item"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
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

      {/* 4. TABEL MUTASI STOK LAB */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Riwayat Mutasi Stok Lab
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Pencatatan otomatis potongan komponen saat Submisi Selesai (COMPLETED) &amp; pasokan masuk
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            Auto-Deduction Engine: ACTIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400 tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-3">Waktu</th>
                <th className="py-3 px-3">SKU &amp; Komponen</th>
                <th className="py-3 px-3 text-center">Tipe Mutasi</th>
                <th className="py-3 px-3 text-center">Jumlah</th>
                <th className="py-3 px-3">Referensi</th>
                <th className="py-3 px-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {mutations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    Belum ada riwayat mutasi stok.
                  </td>
                </tr>
              ) : (
                mutations.map((mut) => (
                  <tr
                    key={mut.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {new Date(mut.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-brand-600 dark:text-brand-400 mr-2">
                        {mut.item_sku}
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {mut.item_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${mut.type === "IN"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"
                          }`}
                      >
                        {mut.type === "IN" ? (
                          <>
                            <ArrowUpLeft className="w-3 h-3" /> MASUK (IN)
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3 h-3" /> KELUAR (OUT)
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-black">
                      <span className={mut.type === "IN" ? "text-emerald-600" : "text-amber-600"}>
                        {mut.type === "IN" ? `+${mut.quantity}` : `-${mut.quantity}`}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-gray-700 dark:text-gray-300">
                      {mut.reference_no}
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {mut.notes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL EDIT & KOREKSI STOK (FULL FORM EDIT) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 text-xs my-8">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-brand-600" />
              Edit &amp; Koreksi Qty Stok Item
            </h3>

            <form onSubmit={handleSaveEditItem} className="space-y-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  SKU Bahan *
                </label>
                <input
                  type="text"
                  required
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Bahan / Komponen *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Koreksi Qty Stok Saat Ini *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editStock}
                    onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 text-brand-900 dark:text-brand-300 font-black text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Batas Minimum Stok *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Unit HPP / Harga Modal (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editUnitCost}
                  onChange={(e) => setEditUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Vendor / Supplier (Nama / URL Link Toko)
                </label>
                <input
                  type="text"
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                  placeholder="e.g. PT Akrilik Optik atau https://tokopedia.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Alasan Koreksi / Penyesuaian
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Salah input awal / Penyesuaian fisik lab"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold cursor-pointer"
                >
                  Simpan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL TAMBAH BAHAN LAB BARU */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 text-xs my-8">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-brand-600" />
              Tambah Bahan Lab / Komponen Baru
            </h3>

            <form onSubmit={handleCreateNewItem} className="space-y-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  SKU Bahan / Kode Material *
                </label>
                <input
                  type="text"
                  required
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="e.g. SLAB-STD-01"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Komponen / Bahan Lab *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Acoustic-Welded Slab Shell Standard 35pt"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Stok Awal (Pcs/Unit) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newInitialStock}
                  onChange={(e) => setNewInitialStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Batas Min Stok (Threshold Alerts) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newMinStock}
                  onChange={(e) => setNewMinStock(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Unit HPP / Biaya Modal (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newUnitCost}
                  onChange={(e) => setNewUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-black text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Vendor / Supplier (Nama / URL Link Store)
                </label>
                <input
                  type="text"
                  value={newVendor}
                  onChange={(e) => setNewVendor(e.target.value)}
                  placeholder="e.g. PT Akrilik Optik atau https://tokopedia.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold cursor-pointer"
                >
                  Simpan Bahan Lab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. RESTOCK & VENDOR EDIT QUICK MODAL */}
      {selectedItemForRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Restock &amp; Atur Vendor: {selectedItemForRestock.name}
            </h3>
            <p className="text-gray-500">
              SKU: <strong className="font-mono text-brand-600">{selectedItemForRestock.sku}</strong> | Stok Saat Ini: <strong>{selectedItemForRestock.current_stock}</strong> (Min: {selectedItemForRestock.min_stock})
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Jumlah Tambahan Stok (Pcs/Unit)
                </label>
                <input
                  type="number"
                  min="0"
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                  placeholder="0 jika hanya ingin mengubah vendor"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black text-base"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Vendor / Supplier (Nama / URL Link Toko)
                </label>
                <input
                  type="text"
                  value={vendorInput}
                  onChange={(e) => setVendorInput(e.target.value)}
                  placeholder="Contoh: PT Akrilik Optik atau https://tokopedia.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Catatan Pengadaan
                </label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="e.g. Pembelian Restock Batch 42"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedItemForRestock(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}