"use client";

import React, { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types/order";
import InvoicePrintModal from "@/components/invoices/InvoicePrintModal";
import { Printer, CheckSquare, Square } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon } from "@/icons";

// Key khusus localStorage untuk halaman Invoices
const INVOICES_STORAGE_KEY = "invoices_page_filters";
const ITEMS_PER_PAGE = 20;

interface SavedInvoiceFilters {
  searchQuery?: string;
  startDateParam?: string;
  endDateParam?: string;
}

function InvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper untuk membaca nilai awal (Prioritas: URL Params -> LocalStorage -> "")
  const getInitialValue = (paramKey: keyof SavedInvoiceFilters) => {
    const urlValue = searchParams.get(paramKey);
    if (urlValue !== null) return urlValue;

    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(INVOICES_STORAGE_KEY);
        if (saved) {
          const parsed: SavedInvoiceFilters = JSON.parse(saved);
          return parsed[paramKey] || "";
        }
      } catch (e) {
        console.error("Gagal membaca filter dari localStorage", e);
      }
    }
    return "";
  };

  // State Filter
  const [searchQuery, setSearchQuery] = useState(() => getInitialValue("searchQuery"));
  const [startDateParam, setStartDateParam] = useState(() => getInitialValue("startDateParam"));
  const [endDateParam, setEndDateParam] = useState(() => getInitialValue("endDateParam"));

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(() => [
    startDateParam ? new Date(`${startDateParam}T00:00:00`) : null,
    endDateParam ? new Date(`${endDateParam}T00:00:00`) : null,
  ]);

  const datePickerRef = useRef<HTMLInputElement | null>(null);
  const fpInstance = useRef<flatpickr.Instance | null>(null);

  // State Checkbox & Modal Cetak
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [ordersToPrint, setOrdersToPrint] = useState<Order[]>([]);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Efek untuk menyimpan semua state filter ke LocalStorage dan URL Params
  useEffect(() => {
    const filtersToSave: SavedInvoiceFilters = {
      searchQuery,
      startDateParam,
      endDateParam,
    };

    // 1. Simpan ke LocalStorage
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(filtersToSave));

    // 2. Simpan ke URL Search Params
    const params = new URLSearchParams();
    if (searchQuery) params.set("searchQuery", searchQuery);
    if (startDateParam) params.set("startDateParam", startDateParam);
    if (endDateParam) params.set("endDateParam", endDateParam);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchQuery, startDateParam, endDateParam, pathname, router]);

  // Inisialisasi & Sync Flatpickr
  useEffect(() => {
    if (datePickerRef.current) {
      if (!fpInstance.current) {
        fpInstance.current = flatpickr(datePickerRef.current, {
          mode: "range",
          dateFormat: "Y-m-d",
          defaultDate:
            startDateParam && endDateParam
              ? [startDateParam, endDateParam]
              : undefined,
          onChange: (selectedDates) => {
            if (selectedDates.length === 2) {
              const startStr = flatpickr.formatDate(selectedDates[0], "Y-m-d");
              const endStr = flatpickr.formatDate(selectedDates[1], "Y-m-d");
              setDateRange([selectedDates[0], selectedDates[1]]);
              setStartDateParam(startStr);
              setEndDateParam(endStr);
            } else if (selectedDates.length === 0) {
              setDateRange([null, null]);
              setStartDateParam("");
              setEndDateParam("");
            }
          },
        });
      } else if (startDateParam && endDateParam) {
        fpInstance.current.setDate([startDateParam, endDateParam], false);
      }
    }

    return () => {
      if (fpInstance.current) {
        fpInstance.current.destroy();
        fpInstance.current = null;
      }
    };
  }, [startDateParam, endDateParam]);

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

  // Filter Data Pesanan berdasarkan Search Query dan Date Range (order_date || created_at)
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Filter Pencarian Text
      const matchesSearch =
        !searchQuery ||
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Filter Tanggal Pesanan (order_date dengan fallback created_at)
      const orderDate = new Date(order.order_date || order.created_at);
      orderDate.setHours(0, 0, 0, 0);

      let matchesStartDate = true;
      if (startDateParam) {
        const start = new Date(`${startDateParam}T00:00:00`);
        matchesStartDate = orderDate >= start;
      }

      let matchesEndDate = true;
      if (endDateParam) {
        const end = new Date(`${endDateParam}T23:59:59`);
        matchesEndDate = orderDate <= end;
      }

      return matchesSearch && matchesStartDate && matchesEndDate;
    });
  }, [orders, searchQuery, startDateParam, endDateParam]);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDateParam, endDateParam]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Handler Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setStartDateParam("");
    setEndDateParam("");
    setDateRange([null, null]);

    if (fpInstance.current) {
      fpInstance.current.clear();
    }

    localStorage.removeItem(INVOICES_STORAGE_KEY);
    router.replace(pathname, { scroll: false });
  };

  // Handler Checkbox Item Individu
  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handler Select All / Deselect All
  const toggleSelectAll = () => {
    const pageIds = paginatedOrders.map((o) => o.id);
    const allPageSelected = pageIds.every((id) => selectedOrderIds.includes(id));
    if (allPageSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  // Cetak Single Order
  const handlePrintSingle = (order: Order) => {
    setOrdersToPrint([order]);
    setIsInvoiceOpen(true);
  };

  // Cetak Selected Checkboxes
  const handlePrintSelected = () => {
    const selectedList = orders.filter((o) => selectedOrderIds.includes(o.id));
    if (selectedList.length > 0) {
      setOrdersToPrint(selectedList);
      setIsInvoiceOpen(true);
    }
  };

  const isAnyFilterActive = searchQuery || startDateParam || endDateParam;

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
          {/* BARIS TOMBOL CETAK PILIHAN */}
          {selectedOrderIds.length > 0 && (
            <button
              onClick={handlePrintSelected}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer border border-purple-700 dark:border-purple-500"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>
                Cetak Gabungan ({selectedOrderIds.length} Order)
              </span>
            </button>
          )}

          {/* RENTANG TANGGAL */}
          <div className="relative w-full sm:w-56 min-w-0">
            <CalenderIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10 w-6 h-6" />
            <input
              ref={datePickerRef}
              className="h-9 w-full pl-9 pr-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 outline-none dark:text-gray-300 cursor-pointer focus:border-brand-500 truncate"
              placeholder="Pilih rentang tanggal..."
            />
          </div>

          {/* SEARCH INPUT */}
          <input
            type="text"
            placeholder="Cari No. Order / Nama Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-60 h-9 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 text-xs outline-none focus:border-brand-500 dark:text-white"
          />

          {/* TOMBOL RESET FILTER */}
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer whitespace-nowrap self-center"
            >
              Reset Filter
            </button>
          )}
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
                    title="Pilih Semua di Halaman Ini"
                  >
                    {paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedOrderIds.includes(o.id)) ? (
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
                    {isAnyFilterActive
                      ? "Tidak ada tagihan invoice yang sesuai dengan filter."
                      : "Belum ada tagihan invoice ditemukan."}
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
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
                          {new Date(order.order_date || order.created_at).toLocaleDateString("id-ID")}
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
                        Rp {Number(order.total_price || 0).toLocaleString("id-ID")}
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
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 transition-colors cursor-pointer"
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

        {/* FOOTER PAGINATION */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {loading ? (
              "Memuat data..."
            ) : filteredOrders.length === 0 ? (
              "Menampilkan 0 data"
            ) : (
              <>
                Menampilkan{" "}
                <span className="font-semibold text-gray-800 dark:text-white">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)}
                </span>{" "}
                dari <span className="font-semibold text-gray-800 dark:text-white">{filteredOrders.length}</span> invoice
              </>
            )}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce<(number | string)[]>((acc, page, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === 'number' && (page as number) - (arr[idx - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((page, idx) =>
                  typeof page === 'string' ? (
                    <span key={`dot-${idx}`} className="px-1.5 text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        currentPage === page
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
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

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-gray-400">Memuat halaman invoice...</div>}>
      <InvoicesContent />
    </Suspense>
  );
}