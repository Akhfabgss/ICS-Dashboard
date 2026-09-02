"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { Order, OrderStatus } from "@/types/order";
import { UserProfile } from "@/types/users";
import Link from "next/link";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);

  // Fetch Daftar Pesanan
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
      // 1. Ambil User & Role yang sedang login
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
          // Normalisasi role ke lowercase & hapus spasi
          setUserRole(String(profile.role).toLowerCase().trim());
        }
      }

      // 2. Ambil Daftar Staf/Profil untuk Dropdown Assignee
      const { data: staff, error: staffError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .order("full_name");

      if (!staffError && staff) {
        setStaffList(staff as UserProfile[]);
      }

      await fetchOrders();
    };

    init();
  }, []);

  // PENGECEKAN ROLE (KEBAL CASE SENSITIVE):
  // Jika role mengandung kata 'staff' atau 'designer', sembunyikan nominal keuangan.
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

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    return orders.filter((o) =>
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  // Update Status Pesanan
  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    const result = await Swal.fire({
      title: "Ubah Status?",
      text: `Ubah status pesanan menjadi "${newStatus}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, Ubah!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) {
      setOrders((prev) => [...prev]);
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      Swal.fire("Error!", "Gagal mengubah status: " + error.message, "error");
    } else {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Status berhasil diperbarui!",
        showConfirmButton: false,
        timer: 2000,
      });
      fetchOrders();
    }
  };

  // Update Penugasan Pekerja (Assignee)
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

  // Hapus Order
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

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
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

      {/* SEARCH */}
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 border-t pt-4 dark:border-gray-800">
        <input
          type="text"
          placeholder="Cari nama pemesan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
        />
      </div>

      {/* TABEL */}
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
                    {searchQuery
                      ? "Tidak ada pesanan yang sesuai dengan pencarian."
                      : "Belum ada pesanan terdaftar."}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  // Matching penugasan staf
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

                      {/* RINCIAN HARGA / STATUS BAYAR */}
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
                          /* HANYA BADGE UNTUK AKUN STAFF */
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
                          onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                          className={`text-xs font-medium rounded-lg px-2.5 py-1.5 border-0 focus:ring-2 focus:ring-brand-500 ${getStatusBadge(
                            order.status
                          )}`}
                        >
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