"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { Order, OrderStatus } from "@/types/order";
import { UserProfile } from "@/types/users";
import Link from "next/link";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon } from "@/icons"; // Sesuaikan path icon milikmu
import { deductStockForOrder } from "@/lib/stockDeduction";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);

  const datePickerRef = useRef<HTMLInputElement | null>(null);
  const fpInstance = useRef<flatpickr.Instance | null>(null);
  // Inisialisasi Flatpickr Rentang Tanggal
  useEffect(() => {
    if (datePickerRef.current) {
      fpInstance.current = flatpickr(datePickerRef.current, {
        mode: "range",
        dateFormat: "Y-m-d",
        onChange: (selectedDates) => {
          if (selectedDates.length === 2) {
            setDateRange([selectedDates[0], selectedDates[1]]);
          } else if (selectedDates.length === 0) {
            setDateRange([null, null]);
          }
        },
      });
    }

    return () => {
      if (fpInstance.current) {
        fpInstance.current.destroy();
      }
    };
  }, []);

  const handleResetDate = () => {
    setDateRange([null, null]);
    if (fpInstance.current) {
      fpInstance.current.clear();
    }
  };

  // Fetch Daftar Pesanan & Staf
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

      // Filter khusus Staf & Designer
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

  const orderSummary = useMemo(() => {
    const totalOrders = orders.length;
    const paidOffOrders = orders.filter((o) => o.is_paid_off).length;
    const pendingPaymentOrders = totalOrders - paidOffOrders;
    const inProgressOrders = orders.filter(
      (o) => o.status === "Proses Design" || o.status === "Pengerjaan"
    ).length;
    return { totalOrders, paidOffOrders, pendingPaymentOrders, inProgressOrders };
  }, [orders]);

  // Filter Gabungan Search Nama & Single Input Date Range
  const filteredOrders = useMemo(() => {
    const [startDate, endDate] = dateRange;

    return orders.filter((o) => {
      const matchesName = !searchQuery || o.customer_name.toLowerCase().includes(searchQuery.toLowerCase());

      const orderDate = new Date(o.created_at);
      orderDate.setHours(0, 0, 0, 0);

      let matchesStartDate = true;
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchesStartDate = orderDate >= start;
      }

      let matchesEndDate = true;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesEndDate = orderDate <= end;
      }

      return matchesName && matchesStartDate && matchesEndDate;
    });
  }, [orders, searchQuery, dateRange]);

  const updateStatus = async (order: Order, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);

    if (error) {
      Swal.fire("Error!", "Gagal mengubah status: " + error.message, "error");
      return;
    }

    // Potong stok otomatis saat status berubah menjadi "Selesai"
    if (newStatus === "Selesai") {
      await deductStockForOrder(
        order.product_name,          // nama produk → di-resolve ke ID di helper
        order.add_ons ?? [],          // nama-nama addon
        1                             // qty order (1 per order)
      );
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

  const getStatusBadge = (status: OrderStatus | string) => {
    switch (status) {
      case "Dalam Daftar":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
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
          className="px-4 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors inline-block"
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

      {/* FILTER TANGGAL RENTANG & PENCARIAN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4 dark:border-gray-800">
        {/* Single Date Range Picker */}
        <div className="relative inline-flex items-center gap-2">
          <div className="relative">
            <CalenderIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10 w-6 h-6" />
            <input
              ref={datePickerRef}
              className="h-9 w-48 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer focus:border-brand-500"
              placeholder="Pilih rentang tgl..."
            />
          </div>

          {dateRange[0] && (
            <button
              onClick={handleResetDate}
              className="text-xs text-rose-500 hover:underline font-medium"
            >
              Reset
            </button>
          )}
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Cari nama pemesan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
        />
      </div>

      {/* TABEL ORDERS */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 border-gray-200 dark:border-gray-800 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">No. Order / Tgl</th>
                <th className="px-4 py-3 font-medium">Pemesan</th>
                <th className="px-4 py-3 font-medium">Produk &amp; Addons</th>
                <th className="px-4 py-3 font-medium">Total &amp; Status Bayar</th>
                <th className="px-4 py-3 font-medium">Status Pesanan</th>
                <th className="px-4 py-3 font-medium">Dikerjakan Oleh</th>
                <th className="px-4 py-3 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-6">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    {searchQuery || dateRange[0]
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

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {order.order_number}
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
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 dark:text-white">
                          {order.product_name}
                        </p>
                        {order.add_ons && order.add_ons.length > 0 && (
                          <p className="text-xs text-gray-500">+ {order.add_ons.join(", ")}</p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isFinanceVisible ? (
                          <>
                            <p className="font-semibold text-gray-800 dark:text-white">
                              Rp {Number(order.total_price || 0).toLocaleString("id-ID")}
                            </p>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${order.is_paid_off
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                }`}
                            >
                              {order.is_paid_off
                                ? "LUNAS"
                                : `Sisa: Rp ${Number(order.remaining_payment || 0).toLocaleString("id-ID")}`}
                            </span>
                          </>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full ${order.is_paid_off
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                              }`}
                          >
                            {order.is_paid_off ? "LUNAS" : "BELUM LUNAS"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order, e.target.value as OrderStatus)}
                          className={`text-xs font-medium rounded-lg px-2.5 py-1.5 border-0 focus:ring-2 focus:ring-brand-500 ${getStatusBadge(
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

                      <td className="px-4 py-3">
                        <select
                          value={selectedAssigneeValue}
                          onChange={(e) => updateAssignee(order.id, e.target.value)}
                          className="text-xs font-medium rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-brand-500 outline-none min-w-[140px]"
                        >
                          <option value="">— Belum Ditugaskan —</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.full_name || s.email}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/orders/${order.id}`}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                            title="Lihat Detail"
                          >
                            Detail
                          </Link>
                          <Link
                            href={`/orders/edit/${order.id}`}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors"
                            title="Edit Order"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(order.id, order.order_number)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors"
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
    </div>
  );
}