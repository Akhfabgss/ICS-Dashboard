"use client";

import React from "react";
import { Order } from "@/types/order";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

interface DetailModalProps {
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export default function OrderDetailModal({ order, isOpen, onClose, onRefresh }: DetailModalProps) {
    if (!isOpen || !order) return null;

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: "Konfirmasi",
            text: `Yakin ingin menghapus order ${order.order_number}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Ya, Hapus!",
            cancelButtonText: "Batal"
        });

        if (result.isConfirmed) {
            const { error } = await supabase.from("orders").delete().eq("id", order.id);
            if (error) {
                Swal.fire("Error!", "Gagal menghapus: " + error.message, "error");
            } else {
                Swal.fire("Terhapus!", "Order berhasil dihapus.", "success");
                onRefresh();
                onClose();
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800 text-gray-800 dark:text-white">
                {/* Header Modal */}
                <div className="flex justify-between items-center pb-4 border-b dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold">{order.order_number}</h2>
                        <p className="text-xs text-gray-500">Tanggal: {new Date(order.created_at).toLocaleString("id-ID")}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                </div>

                {/* Content Detail */}
                <div className="py-4 space-y-4 text-sm">
                    {/* Data Pemesan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Nama Pemesan</p>
                            <p className="font-semibold">{order.customer_name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">No. HP / WA</p>
                            <p className="font-semibold">{order.phone_number}</p>
                        </div>
                        <div className="sm:col-span-2">
                            <p className="text-xs text-gray-400 font-medium">Alamat Pengiriman</p>
                            <p>{order.address || "-"}</p>
                        </div>
                    </div>

                    {/* Rincian Produk & Pesanan */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <p className="text-xs text-gray-400">Produk</p>
                            <p className="font-medium">{order.product_name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Kategori</p>
                            <p className="font-medium">{order.category}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Sumber Order</p>
                            <p className="font-medium">{order.order_source}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-gray-400 mb-1">Tambahan / Add-ons</p>
                        <div className="flex flex-wrap gap-1.5">
                            {order.add_ons && order.add_ons.length > 0 ? (
                                order.add_ons.map((item, idx) => (
                                    <span key={idx} className="px-2.5 py-0.5 text-xs bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 rounded-full">
                                        {item}
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-400 italic text-xs">Tidak ada tambahan</span>
                            )}
                        </div>
                    </div>

                    {/* Rincian Pembayaran */}
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                        <h3 className="font-semibold text-xs uppercase text-gray-400">Rincian Pembayaran</h3>
                        <div className="flex justify-between text-xs">
                            <span>Harga Frame:</span>
                            <span>Rp {order.frame_price.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span>Harga Tambahan:</span>
                            <span>Rp {order.addons_price.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-2 dark:border-gray-700">
                            <span>Total Harga:</span>
                            <span>Rp {order.total_price.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between text-xs text-emerald-600">
                            <span>DP / Pelunasan Terbayar:</span>
                            <span>Rp {(order.dp_amount + order.repayment_amount).toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xs pt-1 border-t dark:border-gray-700">
                            <span>Sisa Pembayaran:</span>
                            <span className={order.remaining_payment <= 0 ? "text-emerald-500" : "text-rose-500"}>
                                Rp {order.remaining_payment.toLocaleString("id-ID")} ({order.is_paid_off ? "LUNAS" : "BELUM LUNAS"})
                            </span>
                        </div>
                    </div>

                    {/* Isian Data Desain */}
                    <div>
                        <p className="text-xs text-gray-400 font-medium mb-1.5">Isian Data dalam Desain</p>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                            {(() => {
                                if (!order.design_data) return <p className="text-xs text-gray-400 italic">-</p>;

                                try {
                                    const parsed = JSON.parse(order.design_data);
                                    if (Array.isArray(parsed)) {
                                        // Filter hanya poin yang nilainya terisi (opsional, hapus .filter jika ingin tampil semua)
                                        const filledFields = parsed.filter((item) => item.value && item.value.trim() !== "");

                                        if (filledFields.length === 0) {
                                            return <p className="text-xs text-gray-400 italic">Belum ada data desain yang diisi.</p>;
                                        }

                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                {filledFields.map((field, idx) => (
                                                    <div key={idx} className="flex flex-col p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                                                        <span className="text-[10px] uppercase font-semibold text-gray-400">{field.key || "Custom"}</span>
                                                        <span className="font-medium text-gray-800 dark:text-gray-200 break-words">{field.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }
                                } catch {
                                    // Fallback jika data lama masih berupa plain text biasa
                                    return <p className="text-xs font-mono text-gray-700 dark:text-gray-300">{order.design_data}</p>;
                                }
                            })()}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                    <button
                        onClick={handleDelete}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400"
                    >
                        Hapus Order
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}