"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { ResellerOrder, ResellerStatus } from "@/types/reseller";
import ResellerFormModal from "@/components/reseller/ResellerFormModal";
import { Users } from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";

export default function ResellerPage() {
  return (
    <RoleGuard allowedRoles={["Owner"]}>
      <ResellerContent />
    </RoleGuard>
  );
}

function ResellerContent() {
  const [resellerOrders, setResellerOrders] = useState<ResellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ResellerOrder | null>(null);

  const fetchResellers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("resellers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setResellerOrders(data as ResellerOrder[]);
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
        if (profile?.role) setUserRole(String(profile.role).toLowerCase().trim());
      }
      await fetchResellers();
    };

    init();
  }, []);

  const normalizedRole = (userRole || "").toLowerCase().trim();
  const isFinanceVisible =
    normalizedRole !== "staff" && normalizedRole !== "designer" && normalizedRole !== "";

  const stats = useMemo(() => {
    const total = resellerOrders.length;
    const completed = resellerOrders.filter((r) => r.status === "Selesai").length;
    const inProgress = resellerOrders.filter(
      (r) =>
        r.status === "Proses Design" ||
        r.status === "Pengerjaan" ||
        r.status === "Pending" ||
        r.status === "Dalam Daftar"
    ).length;
    const totalCommission = resellerOrders.reduce(
      (acc, curr) => acc + Number(curr.commission || 0),
      0
    );

    return { total, completed, inProgress, totalCommission };
  }, [resellerOrders]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return resellerOrders;
    const query = searchQuery.toLowerCase();
    return resellerOrders.filter(
      (r) =>
        r.reseller_name.toLowerCase().includes(query) ||
        r.customer_name.toLowerCase().includes(query) ||
        r.frame_type.toLowerCase().includes(query)
    );
  }, [resellerOrders, searchQuery]);

  const updateStatus = async (id: string, newStatus: ResellerStatus) => {
    const result = await Swal.fire({
      title: "Ubah Status?",
      text: `Ubah status reseller order menjadi "${newStatus}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, Ubah!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) {
      setResellerOrders((prev) => [...prev]);
      return;
    }

    const { error } = await supabase.from("resellers").update({ status: newStatus }).eq("id", id);

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
      fetchResellers();
    }
  };

  const handleDelete = async (id: string, customerName: string) => {
    const result = await Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah kamu yakin ingin menghapus data reseller customer ${customerName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from("resellers").delete().eq("id", id);
      if (error) {
        Swal.fire("Error!", "Gagal menghapus: " + error.message, "error");
      } else {
        Swal.fire("Terhapus!", "Data reseller berhasil dihapus.", "success");
        fetchResellers();
      }
    }
  };

  const getStatusBadge = (status: ResellerStatus) => {
    switch (status) {
      case "Dalam Daftar":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white";
      case "Pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500" />
            Manajemen Order Reseller
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kelola transaksi pesanan dari reseller, status pengerjaan, dan pembagian komisi.
          </p>
        </div>
        <button
          onClick={() => {
            setItemToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors inline-block cursor-pointer"
        >
          + Catat Order Reseller Baru
        </button>
      </div>

      {/* STATISTIK CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium uppercase text-gray-400">Total Order Reseller</span>
          <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{stats.total} Pesanan</h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium uppercase text-gray-400">Dalam Proses</span>
          <h3 className="mt-1 text-2xl font-bold text-amber-500">{stats.inProgress} Pesanan</h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium uppercase text-gray-400">Selesai</span>
          <h3 className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed} Pesanan</h3>
        </div>

        {isFinanceVisible ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-xs font-medium uppercase text-gray-400">Total Komisi</span>
            <h3 className="mt-1 text-2xl font-bold text-brand-600 dark:text-brand-400">
              Rp {stats.totalCommission.toLocaleString("id-ID")}
            </h3>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-xs font-medium uppercase text-gray-400">Akses Tim</span>
            <h3 className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Mode Staff Produksi</h3>
          </div>
        )}
      </div>

      {/* SEARCH BAR */}
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 border-t pt-4 dark:border-gray-800">
        <input
          type="text"
          placeholder="Cari reseller / customer / tipe..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-xs outline-none focus:border-brand-500 dark:text-white"
        />
      </div>

      {/* TABEL DATA RESELLER */}
      <div className="w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-max min-w-full text-left text-sm border-collapse">
            <thead className="border-b bg-gray-50 border-gray-200 dark:border-gray-800 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[130px]">Tgl Pemesanan</th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[130px]">Tgl Pengerjaan</th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[120px]">Reseller</th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[160px]">Customer</th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[220px]">Tipe Bingkai</th>
                {isFinanceVisible && (
                  <th className="px-4 py-3.5 font-medium text-right whitespace-nowrap min-w-[120px]">Komisi</th>
                )}
                <th className="px-4 py-3.5 font-medium whitespace-nowrap min-w-[150px]">Status</th>
                <th className="px-4 py-3.5 font-medium text-center whitespace-nowrap min-w-[140px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={isFinanceVisible ? 8 : 7} className="text-center py-6 whitespace-nowrap">
                    Memuat data order reseller...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={isFinanceVisible ? 8 : 7} className="text-center py-6 text-gray-500 whitespace-nowrap">
                    {searchQuery ? "Tidak ada data reseller yang cocok." : "Belum ada transaksi order reseller."}
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white whitespace-nowrap">
                      {item.order_date ? new Date(item.order_date).toLocaleDateString("id-ID") : "-"}
                    </td>

                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {item.completion_date ? new Date(item.completion_date).toLocaleDateString("id-ID") : "-"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2.5 py-0.5 rounded-full text-xs inline-block">
                        {item.reseller_name}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white whitespace-nowrap">
                      {item.customer_name}
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {item.frame_type}
                    </td>

                    {isFinanceVisible && (
                      <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white whitespace-nowrap">
                        Rp {Number(item.commission || 0).toLocaleString("id-ID")}
                      </td>
                    )}

                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item.id, e.target.value as ResellerStatus)}
                        className={`text-xs font-medium rounded-lg px-2.5 py-1.5 border-0 focus:ring-2 focus:ring-brand-500 cursor-pointer whitespace-nowrap ${getStatusBadge(
                          item.status
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

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setItemToEdit(item);
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.customer_name)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
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

      <ResellerFormModal
        isOpen={isModalOpen}
        itemToEdit={itemToEdit}
        isFinanceVisible={isFinanceVisible}
        onClose={() => {
          setIsModalOpen(false);
          setItemToEdit(null);
        }}
        onSuccess={fetchResellers}
      />
    </div>
  );
}