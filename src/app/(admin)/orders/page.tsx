"use client";

import React, { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { Order, OrderStatus } from "@/types/order";
import { UserProfile } from "@/types/users";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon } from "@/icons";
import { deductStockForOrder } from "@/lib/stockDeduction";

const STORAGE_KEY = "orders_page_filters";

interface SavedFilters {
  searchQuery?: string;
  selectedProduct?: string;
  selectedPaidStatus?: string;
  selectedShippingMethod?: string;
  selectedAssignee?: string;
  startDateParam?: string;
  endDateParam?: string;
}

function parseNamaDalamDesign(designData: string | null | undefined): string {
  if (!designData) return "-";
  try {
    const parsed = JSON.parse(designData);
    if (Array.isArray(parsed)) {
      const match = parsed.find(
        (item) =>
          item.key &&
          item.key.toLowerCase().trim() === "nama dalam design" &&
          item.value &&
          item.value.trim() !== ""
      );
      if (match) return match.value.trim();

      const fallbackMatch = parsed.find(
        (item) =>
          item.key &&
          item.key.toLowerCase().includes("nama") &&
          item.value &&
          item.value.trim() !== ""
      );
      if (fallbackMatch) return fallbackMatch.value.trim();
    }
    if (typeof parsed === "object" && parsed !== null) {
      return (
        parsed["Nama dalam Design"] ||
        parsed["nama_dalam_design"] ||
        parsed["namaDesign"] ||
        "-"
      );
    }
  } catch (e) {
    const lines = designData.split("\n");
    for (const line of lines) {
      if (line.toLowerCase().includes("nama dalam design")) {
        const parts = line.split(":");
        if (parts.length > 1) {
          return parts.slice(1).join(":").trim();
        }
      }
    }
  }
  return designData.trim() || "-";
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);

  // Filter States (Inisialisasi aman tanpa langsung menembak localStorage saat SSR)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedPaidStatus, setSelectedPaidStatus] = useState("");
  const [selectedShippingMethod, setSelectedShippingMethod] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [startDateParam, setStartDateParam] = useState("");
  const [endDateParam, setEndDateParam] = useState("");

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [isInitialized, setIsInitialized] = useState(false);

  const datePickerRef = useRef<HTMLInputElement | null>(null);
  const fpInstance = useRef<flatpickr.Instance | null>(null);

  // 1. Dapatkan Filter Awal setelah Komponen Mount di Klien (Aman dari Crash)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let parsed: SavedFilters = {};
      if (saved) {
        parsed = JSON.parse(saved);
      }

      const search = searchParams.get("searchQuery") || parsed.searchQuery || "";
      const prod = searchParams.get("selectedProduct") || parsed.selectedProduct || "";
      const paid = searchParams.get("selectedPaidStatus") || parsed.selectedPaidStatus || "";
      const ship = searchParams.get("selectedShippingMethod") || parsed.selectedShippingMethod || "";
      const assign = searchParams.get("selectedAssignee") || parsed.selectedAssignee || "";
      const start = searchParams.get("startDateParam") || parsed.startDateParam || "";
      const end = searchParams.get("endDateParam") || parsed.endDateParam || "";

      setSearchQuery(search);
      setSelectedProduct(prod);
      setSelectedPaidStatus(paid);
      setSelectedShippingMethod(ship);
      setSelectedAssignee(assign);
      setStartDateParam(start);
      setEndDateParam(end);

      if (start && end) {
        setDateRange([new Date(`${start}T00:00:00`), new Date(`${end}T00:00:00`)]);
      }
    } catch (err) {
      console.error("Gagal parse localStorage:", err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // 2. Simpan ke LocalStorage & Sync URL (Hanya berjalan setelah Inisialisasi Selesai)
  useEffect(() => {
    if (!isInitialized) return;

    const filtersToSave: SavedFilters = {
      searchQuery,
      selectedProduct,
      selectedPaidStatus,
      selectedShippingMethod,
      selectedAssignee,
      startDateParam,
      endDateParam,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (e) {
      console.error("Gagal menyimpan ke localStorage:", e);
    }
  }, [
    searchQuery,
    selectedProduct,
    selectedPaidStatus,
    selectedShippingMethod,
    selectedAssignee,
    startDateParam,
    endDateParam,
    isInitialized,
  ]);

  // Inisialisasi & Sync Flatpickr
  useEffect(() => {
    if (!isInitialized) return;

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
  }, [startDateParam, endDateParam, isInitialized]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedProduct("");
    setSelectedPaidStatus("");
    setSelectedShippingMethod("");
    setSelectedAssignee("");
    setStartDateParam("");
    setEndDateParam("");
    setDateRange([null, null]);

    if (fpInstance.current) {
      fpInstance.current.clear();
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Gagal hapus localStorage:", e);
    }
    router.replace(pathname, { scroll: false });
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role) {
          setUserRole(String(profile.role).toLowerCase().trim());
        }
      }

      const { data: staff, error: staffError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .order("full_name");

      if (!staffError && staff) {
        const onlyStaff = (staff as UserProfile[]).filter((s) => {
          const r = String(s.role || "").toLowerCase().trim();
          return r === "staff" || r === "designer";
        });
        setStaffList(onlyStaff);
      }

      await fetchOrders();
    };

    init();
  }, []);

  const normalizedRole = (userRole || "").toLowerCase().trim();
  const isFinanceVisible =
    normalizedRole !== "staff" &&
    normalizedRole !== "designer" &&
    normalizedRole !== "";

  const uniqueProducts = useMemo(() => {
    const products = orders.map((o) => o.product_name).filter(Boolean);
    return Array.from(new Set(products)).sort();
  }, [orders]);

  // Filter Data Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !searchQuery ||
        (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.order_number && o.order_number.toLowerCase().includes(searchQuery.toLowerCase()));

      const orderDate = new Date(o.order_date || o.created_at);
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

      const matchesProduct = !selectedProduct || o.product_name === selectedProduct;

      let matchesPaidStatus = true;
      if (selectedPaidStatus === "LUNAS") {
        matchesPaidStatus = o.is_paid_off === true;
      } else if (selectedPaidStatus === "BELUM_LUNAS") {
        matchesPaidStatus = o.is_paid_off === false;
      }

      const matchesShipping =
        !selectedShippingMethod || o.shipping_method === selectedShippingMethod;

      let matchesAssignee = true;
      if (selectedAssignee === "UNASSIGNED") {
        matchesAssignee = !o.assigned_to;
      } else if (selectedAssignee) {
        matchesAssignee = o.assigned_to === selectedAssignee;
      }

      return (
        matchesSearch &&
        matchesStartDate &&
        matchesEndDate &&
        matchesProduct &&
        matchesPaidStatus &&
        matchesShipping &&
        matchesAssignee
      );
    });
  }, [
    orders,
    searchQuery,
    startDateParam,
    endDateParam,
    selectedProduct,
    selectedPaidStatus,
    selectedShippingMethod,
    selectedAssignee,
  ]);

  const orderSummary = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const paidOffOrders = filteredOrders.filter((o) => o.is_paid_off).length;
    const pendingPaymentOrders = totalOrders - paidOffOrders;
    const inProgressOrders = filteredOrders.filter(
      (o) => o.status === "Proses Design" || o.status === "Pengerjaan"
    ).length;
    return { totalOrders, paidOffOrders, pendingPaymentOrders, inProgressOrders };
  }, [filteredOrders]);

  const updateStatus = async (order: Order, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);

    if (error) {
      Swal.fire("Error!", "Gagal mengubah status: " + error.message, "error");
      return;
    }

    if (newStatus === "Selesai") {
      await deductStockForOrder(order.product_name, order.add_ons ?? [], 1);
    }

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Status berhasil diperbarui!",
      showConfirmButton: false,
      timer: 2000,
    });
    fetchOrders();
  };

  const updateAssignee = async (id: string, assignedToValue: string) => {
    const selectedStaff = staffList.find(
      (s) => s.id === assignedToValue || s.full_name === assignedToValue
    );

    const staffName = selectedStaff?.full_name ?? (assignedToValue || "Tidak ada");
    const valueToSave = assignedToValue || null;

    const { error } = await supabase
      .from("orders")
      .update({ assigned_to: valueToSave })
      .eq("id", id);

    if (error) {
      Swal.fire("Error!", "Gagal mengubah penugasan: " + error.message, "error");
    } else {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `Dikerjakan oleh: ${staffName}`,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchOrders();
    }
  };

  const handleDelete = async (id: string, orderNumber: string) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah kamu yakin ingin menghapus pesanan ${orderNumber}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const { data, error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        Swal.fire("Error!", "Gagal menghapus: " + error.message, "error");
      } else if (!data || data.length === 0) {
        Swal.fire("Error!", "Gagal menghapus! Cek RLS DELETE policy di Supabase.", "error");
      } else {
        Swal.fire("Terhapus!", "Pesanan berhasil dihapus.", "success");
        fetchOrders();
      }
    }
  };

  const handleDuplicate = async (orderToDuplicate: Order) => {
    const result = await Swal.fire({
      title: "Duplikat Pesanan?",
      text: `Buat pesanan baru dengan menyalin data dari ${orderToDuplicate.order_number}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Duplikat!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    const newOrderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const {
      id,
      created_at,
      total_price,
      remaining_payment,
      is_paid_off,
      ...restOrder
    } = orderToDuplicate;

    const duplicatedData = {
      ...restOrder,
      order_number: newOrderNumber,
      status: "Dalam Daftar" as OrderStatus,
      assigned_to: null,
    };

    const { data, error } = await supabase
      .from("orders")
      .insert([duplicatedData])
      .select()
      .single();

    if (error) {
      Swal.fire("Error!", "Gagal menduplikat pesanan: " + error.message, "error");
      return;
    }

    Swal.fire({
      title: "Pesanan Diduplikat!",
      text: `Pesanan baru ${newOrderNumber} berhasil dibuat. Masuk ke halaman edit untuk mengubah isian data desain?`,
      icon: "success",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#4f46e5",
      confirmButtonText: "Edit Data Desain",
      cancelButtonText: "Tetap di Sini",
    }).then((res) => {
      if (res.isConfirmed && data?.id) {
        router.push(`/orders/edit/${data.id}`);
      } else {
        fetchOrders();
      }
    });
  };

  const getStatusBadge = (status: OrderStatus | string) => {
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

  const isAnyFilterActive =
    searchQuery ||
    startDateParam ||
    endDateParam ||
    selectedProduct ||
    selectedPaidStatus ||
    selectedShippingMethod ||
    selectedAssignee;

  return (
    <div className="p-4 sm:p-6 space-y-6 text-gray-900 dark:text-gray-100 min-w-0 max-w-full">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Data Pemesan (Orders)
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kelola pesanan, status alur pengerjaan, dan rincian datanya.
          </p>
        </div>
        <Link
          href="/orders/create"
          className="px-4 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors inline-block text-center"
        >
          + Tambah Pesanan Baru
        </Link>
      </div>

      {/* STATISTIK CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium uppercase text-gray-400">Total Pesanan</span>
          <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
            {orderSummary.totalOrders} Pesanan
          </h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium uppercase text-gray-400">Lunas (Paid Off)</span>
          <h3 className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {orderSummary.paidOffOrders} Pesanan
          </h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium uppercase text-gray-400">Belum Lunas / DP</span>
          <h3 className="mt-1 text-2xl font-bold text-rose-500">
            {orderSummary.pendingPaymentOrders} Pesanan
          </h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium uppercase text-gray-400">Proses / Pengerjaan</span>
          <h3 className="mt-1 text-2xl font-bold text-amber-500">
            {orderSummary.inProgressOrders} Pesanan
          </h3>
        </div>
      </div>

      {/* SECTION FILTER & SEARCH */}
      <div className="rounded-xl border-t pt-4 dark:border-gray-800 dark:bg-gray-900 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Filter Data
          </span>
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
            >
              Reset Semua Filter
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* BARIS 1: Search Bar */}
          <input
            type="text"
            placeholder="Cari nama / no. order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 text-xs outline-none focus:border-brand-500 dark:text-white"
          />

          {/* BARIS 2: Filter Options */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
            {/* Rentang Tanggal */}
            <div className="relative flex-1 w-full min-w-0">
              <CalenderIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10 w-6 h-6" />
              <input
                ref={datePickerRef}
                className="h-9 w-full pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer focus:border-brand-500 truncate"
                placeholder="Pilih rentang tanggal..."
              />
            </div>

            {/* Filter 1: Produk */}
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="h-9 flex-1 w-full min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500 cursor-pointer truncate"
            >
              <option value="">Semua Produk</option>
              {uniqueProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Filter 2: Status Bayar */}
            <select
              value={selectedPaidStatus}
              onChange={(e) => setSelectedPaidStatus(e.target.value)}
              className="h-9 flex-1 w-full min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500 cursor-pointer truncate"
            >
              <option value="">Semua Status Bayar</option>
              <option value="LUNAS">LUNAS</option>
              <option value="BELUM_LUNAS">BELUM LUNAS / DP</option>
            </select>

            {/* Filter 3: Kurir */}
            <select
              value={selectedShippingMethod}
              onChange={(e) => setSelectedShippingMethod(e.target.value)}
              className="h-9 flex-1 w-full min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500 cursor-pointer truncate"
            >
              <option value="">Semua Kurir</option>
              <option value="JNE">JNE</option>
              <option value="J&T">J&amp;T Express</option>
              <option value="SPX">SPX (Shopee Express)</option>
              <option value="Lion Parcel">Lion Parcel</option>
              <option value="Di Tempat">Di Tempat (Ambil Toko)</option>
            </select>

            {/* Filter 4: Staf */}
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="h-9 flex-1 w-full min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500 cursor-pointer truncate"
            >
              <option value="">Semua Staf</option>
              <option value="UNASSIGNED">Belum Ditugaskan</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CONTAINER UTAMA TABEL */}
      <div className="w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-max min-w-full text-left text-sm border-collapse">
            <thead className="border-b bg-gray-50 border-gray-200 dark:border-gray-800 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[140px]">
                  No. Order / Tgl
                </th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[160px]">
                  Pemesan
                </th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[280px]">
                  Produk &amp; Addons
                </th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[180px]">
                  Total &amp; Status Bayar
                </th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[150px]">
                  Status Pesanan
                </th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[120px]">
                  Pengiriman
                </th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[180px]">
                  Dikerjakan Oleh
                </th>
                <th className="px-4 py-3.5 font-medium text-center whitespace-nowrap min-w-[240px]">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 whitespace-nowrap">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-6 text-gray-500 whitespace-nowrap"
                  >
                    {isAnyFilterActive
                      ? "Tidak ada pesanan yang sesuai dengan filter."
                      : "Belum ada pesanan terdaftar."}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const selectedAssigneeValue =
                    staffList.find(
                      (s) =>
                        s.id === order.assigned_to ||
                        s.full_name === order.assigned_to
                    )?.id ||
                    order.assigned_to ||
                    "";

                  const namaDalamDesign = parseNamaDalamDesign(order.design_data);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      {/* No Order / Tanggal */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                          {order.order_number}
                        </p>
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(order.order_date || order.created_at).toLocaleDateString("id-ID")}
                        </p>
                      </td>

                      {/* Pemesan */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-800 dark:text-white whitespace-nowrap">
                          {order.customer_name}
                        </p>
                        <p
                          className="text-xs text-gray-500 whitespace-nowrap truncate max-w-[180px]"
                          title={namaDalamDesign}
                        >
                          {namaDalamDesign}
                        </p>
                      </td>

                      {/* Produk & Addons */}
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800 dark:text-white">
                          {order.product_name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {order.category}
                        </p>
                        {order.add_ons && order.add_ons.length > 0 && (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            + {order.add_ons.join(", ")}
                          </p>
                        )}
                      </td>

                      {/* Total & Status Bayar */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isFinanceVisible ? (
                          <>
                            <p className="font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                              Rp{" "}
                              {Number(order.total_price || 0).toLocaleString("id-ID")}
                            </p>
                            <span
                              className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${order.is_paid_off
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                }`}
                            >
                              {order.is_paid_off
                                ? "LUNAS"
                                : `Sisa: Rp ${Number(
                                  order.remaining_payment || 0
                                ).toLocaleString("id-ID")}`}
                            </span>
                          </>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap ${order.is_paid_off
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                              }`}
                          >
                            {order.is_paid_off ? "LUNAS" : "BELUM LUNAS"}
                          </span>
                        )}
                      </td>

                      {/* Status Pesanan */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            updateStatus(order, e.target.value as OrderStatus)
                          }
                          className={`text-xs font-medium rounded-lg px-2.5 py-1.5 border-0 focus:ring-2 focus:ring-brand-500 cursor-pointer whitespace-nowrap ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          <option value="Dalam Daftar">Dalam Daftar</option>
                          <option value="Pending">Pending</option>
                          <option value="Proses Design">Proses Design</option>
                          <option value="Pengerjaan">Pengerjaan</option>
                          <option value="Pengiriman">Pengiriman</option>
                          <option value="Selesai">Selesai</option>
                          <option value="Trouble">Trouble</option>
                        </select>
                      </td>

                      {/* Pengiriman */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md text-gray-800 dark:bg-indigo-950/40 dark:text-white whitespace-nowrap">
                          {order.shipping_method || "JNE"}
                        </span>
                      </td>

                      {/* Dikerjakan Oleh */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={selectedAssigneeValue}
                          onChange={(e) =>
                            updateAssignee(order.id, e.target.value)
                          }
                          className="text-xs font-medium rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-brand-500 outline-none w-full cursor-pointer whitespace-nowrap"
                        >
                          <option value="">Belum Ditugaskan</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.full_name || s.email}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <Link
                            href={`/orders/${order.id}`}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors whitespace-nowrap"
                            title="Lihat Detail"
                          >
                            Detail
                          </Link>

                          <button
                            onClick={() => handleDuplicate(order)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer whitespace-nowrap"
                            title="Duplikat Pesanan Ini"
                          >
                            Duplikat
                          </button>

                          <Link
                            href={`/orders/edit/${order.id}`}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors whitespace-nowrap"
                            title="Edit Order"
                          >
                            Edit
                          </Link>

                          <button
                            onClick={() =>
                              handleDelete(order.id, order.order_number)
                            }
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer whitespace-nowrap"
                            title="Hapus Order"
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

      {/* FOOTER */}
      <div className="flex items-center justify-between border-gray-200 px-4 py-3 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {loading ? (
            "Memuat data..."
          ) : filteredOrders.length === 0 ? (
            "Menampilkan 0 data"
          ) : (
            <>
              Menampilkan <span className="font-semibold text-gray-800 dark:text-white">{filteredOrders.length}</span> Total orderan
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-gray-400">Memuat halaman orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}