"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types/order";
import InvoicePrintModal from "@/components/invoices/InvoicePrintModal";
import { Printer, CheckSquare, Square } from "lucide-react";

export default function InvoicesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // State untuk menyimpan ID pesanan yang dicentang (Checkbox)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // State untuk modal cetak
  const [ordersToPrint, setOrdersToPrint] = useState<Order[]>([]);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter daftar pesanan berdasarkan pencarian
  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  // Handler Checkbox Item Individu
  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handler Select All / Deselect All
  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  // 1. Cetak Single Order dari Tombol Aksi Tabel
  const handlePrintSingle = (order: Order) => {
    setOrdersToPrint([order]);
    setIsInvoiceOpen(true);
  };

  // 2. Cetak Pilihan (Selected Checkboxes)
  const handlePrintSelected = () => {
    const selectedList = orders.filter((o) => selectedOrderIds.includes(o.id));
    if (selectedList.length > 0) {
      setOrdersToPrint(selectedList);
      setIsInvoiceOpen(true);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Daftar Tagihan &amp; Invoice
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pilih pesanan menggunakan checkbox untuk mencetak invoice gabungan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* BARIS TOMBOL CETAK PILIHAN (HANYA MUNCUL JIKA ADA YANG DICENTANG) */}
          {selectedOrderIds.length > 0 && (
            <button
              onClick={handlePrintSelected}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-black dark:text-white font-bold text-xs shadow-md transition-all cursor-pointer border border-purple-700 dark:border-purple-500"
            >
              <Printer className="w-4 h-4 dark:text-white" />
              <span className=" dark:text-white">
                Cetak Gabungan ({selectedOrderIds.length} Order)
              </span>
            </button>
          )}

          <input
            type="text"
            placeholder="Cari No. Order / Nama Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-xs outline-none focus:border-brand-500 dark:text-white"
          />
        </div>
      </div>

      {/* TABEL INVOICE DENGAN CHECKBOX */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 border-gray-200 dark:border-gray-800 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-500 hover:text-brand-500 focus:outline-none"
                    title="Pilih Semua"
                  >
                    {selectedOrderIds.length > 0 &&
                      selectedOrderIds.length === filteredOrders.length ? (
                      <CheckSquare className="w-4 h-4 text-brand-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">No. Invoice / Tgl</th>
                <th className="px-4 py-3 font-medium">Nama Customer</th>
                <th className="px-4 py-3 font-medium">Produk</th>
                <th className="px-4 py-3 font-medium">Total Tagihan</th>
                <th className="px-4 py-3 font-medium">Status Bayar</th>
                <th className="px-4 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-6">
                    Memuat invoice...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    Tidak ada tagihan invoice ditemukan.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isChecked = selectedOrderIds.includes(order.id);

                  return (
                    <tr
                      key={order.id}
                      className={`transition-colors ${isChecked
                        ? "bg-brand-50/40 dark:bg-brand-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                    >
                      {/* CHECKBOX PER BARIS */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-brand-600 dark:text-brand-400">
                          #{order.order_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString("id-ID")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 dark:text-white">
                          {order.customer_name}
                        </p>
                        <p className="text-xs text-gray-500">{order.phone_number}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                        {order.product_name}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">
                        Rp {order.total_price.toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${order.is_paid_off
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                            }`}
                        >
                          {order.is_paid_off ? "LUNAS" : "BELUM LUNAS"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handlePrintSingle(order)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 transition-colors"
                        >
                          🖨️ Cetak Satuan
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PRINT INVOICE */}
      <InvoicePrintModal
        orders={ordersToPrint}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div>
  );
} 