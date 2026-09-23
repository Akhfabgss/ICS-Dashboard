"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types/order";
import { UserProfile } from "@/types/users";
import Swal from "sweetalert2";
import { ArrowLeft, Trash2, Edit, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [staffList, setStaffList] = useState<UserProfile[]>([]);

    const fetchOrderDetail = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();

        if (error || !data) {
            Swal.fire("Error", "Data pesanan tidak ditemukan", "error");
            router.push("/orders");
        } else {
            setOrder(data as Order);
        }
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
            const { data: staff } = await supabase
                .from("profiles")
                .select("id, full_name, email, role")
                .order("full_name");
            if (staff) setStaffList(staff as UserProfile[]);
        };
        init();
        if (orderId) fetchOrderDetail();
    }, [orderId]);

    const normalizedRole = (userRole || "").toLowerCase().trim();
    const isFinanceVisible =
        normalizedRole !== "staff" &&
        normalizedRole !== "designer" &&
        normalizedRole !== "";

    const getAssigneeName = (assignedTo?: string | null) => {
        if (!assignedTo) return "Belum Ditugaskan";
        const staff = staffList.find(
            (s) => s.id === assignedTo || s.full_name === assignedTo
        );
        return staff?.full_name ?? assignedTo;
    };

    const handleDelete = async () => {
        if (!order) return;
        const result = await Swal.fire({
            title: "Konfirmasi Hapus",
            text: `Yakin ingin menghapus order ${order.order_number}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Ya, Hapus!",
            cancelButtonText: "Batal",
        });
        if (result.isConfirmed) {
            const { error } = await supabase
                .from("orders")
                .delete()
                .eq("id", order.id);
            if (error) {
                Swal.fire("Error!", "Gagal menghapus: " + error.message, "error");
            } else {
                Swal.fire("Terhapus!", "Order berhasil dihapus.", "success");
                router.push("/orders");
            }
        }
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-500">
                Memuat detail pesanan...
            </div>
        );
    }

    if (!order) return null;

    return (
        <div className="mx-auto space-y-6 pb-12 p-4 sm:p-6 text-gray-900 dark:text-gray-100">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                            Detail Pesanan: {order.order_number}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Dibuat pada:{" "}
                            {new Date(order.created_at).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short",
                            })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/orders/edit/${order.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 transition-colors cursor-pointer"
                    >
                        <Edit className="w-4 h-4" />
                        Edit Pesanan
                    </Link>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 transition-colors cursor-pointer"
                    >
                        <Trash2 className="w-4 h-4" />
                        Hapus Pesanan
                    </button>
                </div>
            </div>

            {/* 1. INFORMASI PEMESAN */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                <h3 className="font-bold text-gray-800 dark:text-white text-base">
                    1. Data Pemesan &amp; Pengiriman
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-xs text-gray-400 font-medium block">
                            Nama Pemesan
                        </span>
                        <p className="font-semibold text-gray-800 dark:text-white">
                            {order.customer_name}
                        </p>
                    </div>

                    <div>
                        <span className="text-xs text-gray-400 font-medium block">
                            Tanggal Order
                        </span>
                        <p className="font-semibold text-gray-800 dark:text-white">
                            {order.order_date
                                ? new Date(order.order_date).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })
                                : new Date(order.created_at).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                        </p>
                    </div>

                    <div>
                        <span className="text-xs text-gray-400 font-medium block">
                            No. WhatsApp / HP
                        </span>
                        <p className="font-semibold text-gray-800 dark:text-white">
                            {order.phone_number}
                        </p>
                    </div>

                    <div>
                        <span className="text-xs text-gray-400 font-medium block">
                            Dikerjakan Oleh
                        </span>
                        <p className="font-semibold text-gray-800 dark:text-white">
                            {getAssigneeName(order.assigned_to)}
                        </p>
                    </div>

                    <div>
                        <span className="text-xs text-gray-400 font-medium block">
                            Tipe / Kurir Pengiriman
                        </span>
                        <span className="inline-block mt-0.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            {order.shipping_method || "JNE"}
                        </span>
                    </div>

                    <div className="sm:col-span-3">
                        <span className="text-xs text-gray-400 font-medium block">
                            Alamat Pengiriman
                        </span>
                        <p className="text-gray-700 dark:text-gray-300">
                            {order.address || "-"}
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. PRODUK & ADD-ONS */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                <h3 className="font-bold text-gray-800 dark:text-white text-base">
                    2. Rincian Item Pesanan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="text-xs text-gray-400 block">Kategori Desain</span>
                        <p className="font-bold text-purple-600 dark:text-purple-400 text-base">
                            {order.category || "PENDAKIAN"}
                        </p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-400 block">Produk Utama</span>
                        <p className="font-semibold text-brand-600 dark:text-brand-400 text-base">
                            {order.product_name}
                        </p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-400 block">Sumber Order</span>
                        <p className="font-medium text-gray-800 dark:text-white">
                            {order.order_source}
                        </p>
                    </div>
                </div>
                <div>
                    <span className="text-xs text-gray-400 block mb-2">
                        Tambahan / Add-ons
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {order.add_ons && order.add_ons.length > 0 ? (
                            order.add_ons.map((addon, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                                >
                                    {addon}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-400 italic text-sm">
                                Tidak ada tambahan / Add-ons
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. RINCIAN KEUANGAN */}
            {isFinanceVisible && (() => {
                const framePrice = Number(order.frame_price || 0);
                const addonsPrice = Number(order.addons_price || 0);
                const shippingFee = Number(order.shipping_fee || 0);
                const discountAmount = Number(order.discount_amount || 0);
                const dpAmount = Number(order.dp_amount || 0);
                const repaymentAmount = Number(order.repayment_amount || 0);

                // Total Tagihan Bersih = (Frame + Addons + Ongkir) - Diskon
                const calculatedTotal = (framePrice + addonsPrice + shippingFee) - discountAmount;
                
                // Total yang sudah dibayarkan pelanggan
                const totalPaid = dpAmount + repaymentAmount;
                
                // Sisa pembayaran (Jika <= 0 maka LUNAS)
                const calculatedRemaining = calculatedTotal - totalPaid;
                const isPaidOff = calculatedRemaining <= 0;

                return (
                    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-xs">
                        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-2">
                            3. Ringkasan Pembayaran
                        </h3>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>Harga Frame:</span>
                            <span>Rp {framePrice.toLocaleString("id-ID")}</span>
                        </div>
                        {addonsPrice > 0 && (
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Harga Tambahan (Add-ons):</span>
                                <span>Rp {addonsPrice.toLocaleString("id-ID")}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>Ongkir:</span>
                            <span>Rp {shippingFee.toLocaleString("id-ID")}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-rose-500 font-medium">
                                <span>Diskon (Potongan):</span>
                                <span>- Rp {discountAmount.toLocaleString("id-ID")}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-bold border-t dark:border-gray-800 pt-2 text-gray-800 dark:text-white">
                            <span>Total Harga:</span>
                            <span>Rp {calculatedTotal.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between text-sm text-emerald-600 font-medium">
                            <span>DP / Pelunasan Terbayar:</span>
                            <span>Rp {totalPaid.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold border-t dark:border-gray-800 pt-2">
                            <span className="dark:text-white">Sisa Tagihan:</span>
                            <span className={isPaidOff ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                                Rp {Math.max(0, calculatedRemaining).toLocaleString("id-ID")}{" "}
                                ({isPaidOff ? "LUNAS" : "BELUM LUNAS"})
                            </span>
                        </div>
                    </div>
                );
            })()}

            {/* 4. ISIAN DATA DESAIN */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                <h3 className="font-bold text-gray-800 dark:text-white text-base">
                    {isFinanceVisible ? "4." : "3."} Data Isian Desain
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    {(() => {
                        if (!order.design_data)
                            return (
                                <p className="text-sm text-gray-400 italic">
                                    Belum ada data isian.
                                </p>
                            );
                        try {
                            const parsed = JSON.parse(order.design_data);
                            if (Array.isArray(parsed)) {
                                const filled = parsed.filter(
                                    (item) => item.value && item.value.trim() !== ""
                                );
                                if (filled.length === 0)
                                    return (
                                        <p className="text-sm text-gray-400 italic">
                                            Belum ada data desain yang diisi.
                                        </p>
                                    );

                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                        {filled.map((field, idx) => {
                                            const isUrl =
                                                field.value.startsWith("http://") ||
                                                field.value.startsWith("https://");

                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex flex-col p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-700/60"
                                                >
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">
                                                        {field.key || "Custom"}
                                                    </span>
                                                    {isUrl ? (
                                                        <a
                                                            href={field.value}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-semibold text-brand-600 dark:text-brand-400 hover:underline mt-0.5 break-all inline-flex items-center gap-1 text-xs"
                                                        >
                                                            <span>Buka Tautan</span>
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 break-words">
                                                            {field.value}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            }
                        } catch {
                            return (
                                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                                    {order.design_data}
                                </p>
                            );
                        }
                    })()}
                </div>
            </div>
        </div>
    );
}