"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Order, OrderStatus } from "@/types/order";
import { InventoryItem } from "@/types/inventory";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [finances, setFinances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Data Real-time dari Supabase
  const fetchDashboardData = async () => {
    setLoading(true);

    const [ordersRes, inventoryRes, financesRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory").select("*"),
      supabase.from("finances").select("*"),
    ]);

    if (ordersRes.data) setOrders(ordersRes.data as Order[]);
    if (inventoryRes.data) setInventoryItems(inventoryRes.data as InventoryItem[]);
    if (financesRes.data) setFinances(financesRes.data);

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 1. Kalkulasi 4 Stat Cards
  const stats = useMemo(() => {
    // Total Revenue (Dari DP + Pelunasan Pesanan + Pemasukan Kas Manual)
    const orderRevenue = orders.reduce(
      (acc, curr) => acc + Number(curr.dp_amount || 0) + Number(curr.repayment_amount || 0),
      0
    );

    const financeIncome = finances.reduce(
      (acc, curr) => acc + Number(curr.income || 0),
      0
    );

    const totalRevenue = orderRevenue + financeIncome;

    // Total Expense (Dari Catatan Kas Pengeluaran)
    const totalExpense = finances.reduce(
      (acc, curr) => acc + Number(curr.expense || 0),
      0
    );

    const netProfit = totalRevenue - totalExpense;
    const totalOrdersCount = orders.length;

    return {
      revenue: totalRevenue,
      expense: totalExpense,
      netProfit,
      totalOrders: totalOrdersCount,
    };
  }, [orders, finances]);

  // 2. Transaksi Pesanan Terakhir (5 Data Terbaru)
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  // 3. Kalkulasi Stok Menipis (Agregasi Nama Barang dari Inventory, Batas <= 5)
  const lowStockItems = useMemo(() => {
    const summaryMap: Record<string, { category: string; remaining: number }> = {};

    inventoryItems.forEach((item) => {
      const name = item.item_name.trim();
      if (!summaryMap[name]) {
        summaryMap[name] = { category: item.category, remaining: 0 };
      }
      const stockIn = Number(item.stock_in || 0);
      const stockOut = Number(item.stock_out || 0);
      summaryMap[name].remaining += stockIn - stockOut;
    });

    return Object.entries(summaryMap)
      .map(([name, data]) => ({
        name,
        category: data.category,
        stock: data.remaining,
      }))
      .filter((item) => item.stock <= 5);
  }, [inventoryItems]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "Proses Design":
        return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";
      case "Pengerjaan":
        return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
      case "Pengiriman":
        return "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400";
      case "Selesai":
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500";
      case "Trouble":
        return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. 4 STAT CARDS KUSTOM SESUAI SPESIFIKASI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Revenue */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue (Pemasukan)</span>
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
            {loading ? "..." : `Rp ${stats.revenue.toLocaleString("id-ID")}`}
          </h4>
          <span className="text-xs font-medium text-emerald-500 mt-1 inline-block">Real-time DB</span>
        </div>

        {/* Total Expense */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expense (Pengeluaran)</span>
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
            {loading ? "..." : `Rp ${stats.expense.toLocaleString("id-ID")}`}
          </h4>
          <span className="text-xs font-medium text-rose-500 mt-1 inline-block">Dari Mutasi Kas</span>
        </div>

        {/* Net Profit */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Profit (Keuntungan)</span>
          <h4 className={`text-2xl font-bold mt-2 ${stats.netProfit < 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
            {loading ? "..." : `Rp ${stats.netProfit.toLocaleString("id-ID")}`}
          </h4>
          <span className="text-xs text-gray-400 mt-1 inline-block">Estimasi Bersih</span>
        </div>

        {/* Total Orders */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</span>
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
            {loading ? "..." : `${stats.totalOrders} Transaksi`}
          </h4>
          <span className="text-xs font-medium text-brand-500 mt-1 inline-block">Tercatat di Sistem</span>
        </div>
      </div>

      {/* 2. GRAFIK PEMASUKAN VS PENGELUARAN */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <StatisticsChart />
        </div>
      </div>

      {/* 3. TABEL PESANAN TERAKHIR & STOK MENIPIS */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Recent Orders */}
        <div className="col-span-12 xl:col-span-8 rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Pesanan Terakhir (Recent Orders)</h3>
            <Link href="/orders" className="text-sm text-brand-500 hover:underline font-medium">
              Lihat Semua
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="p-3">ID Order</th>
                  <th className="p-3">Pelanggan</th>
                  <th className="p-3">No. Telp</th>
                  <th className="p-3">Produk</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-400">Memuat pesanan...</td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-400">Belum ada pesanan.</td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="p-3 font-medium text-gray-800 dark:text-white">{order.order_number}</td>
                      <td className="p-3 text-gray-700 dark:text-gray-300">{order.customer_name}</td>
                      <td className="p-3 text-gray-500">{order.phone_number}</td>
                      <td className="p-3 text-gray-700 dark:text-gray-300">{order.product_name}</td>
                      <td className="p-3 font-semibold text-gray-800 dark:text-white">
                        Rp {order.total_price.toLocaleString("id-ID")}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock */}
        <div className="col-span-12 xl:col-span-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Peringatan Stok Menipis</h3>
            <Link href="/stock" className="text-xs text-brand-500 hover:underline">Kelola Stok</Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              <p className="text-xs text-gray-400">Memuat stok...</p>
            ) : lowStockItems.length === 0 ? (
              <p className="text-xs text-emerald-500 font-medium">Semua stok barang aman (di atas 5 Pcs).</p>
            ) : (
              lowStockItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-3 dark:border-gray-800">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-400">Kategori: {item.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-rose-500">{item.stock} pcs tersisa</span>
                    <p className="text-xs text-gray-400">Batas Min: 5 pcs</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}