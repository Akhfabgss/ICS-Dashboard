"use client";

import React from "react";
import { Order } from "@/types/order";

interface InvoiceModalProps {
  orders: Order[];
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoicePrintModal({ orders, isOpen, onClose }: InvoiceModalProps) {
  if (!isOpen || orders.length === 0) return null;

  const mainOrder = orders[0]; // Referensi data utama pemesan

  const handlePrint = () => {
    window.print();
  };

  // Kalkulasi Akumulasi Multi Item / Single Item
  const totalFrameAndAddons = orders.reduce(
    (sum, o) => sum + Number(o.frame_price || 0) + Number(o.addons_price || 0),
    0
  );
  const totalShipping = orders.reduce((sum, o) => sum + Number(o.shipping_fee || 0), 0);
  const totalDiscount = orders.reduce((sum, o) => sum + Number(o.discount_amount || 0), 0);

  const grandTotalPrice = totalFrameAndAddons + totalShipping - totalDiscount;

  const totalPaid = orders.reduce(
    (sum, o) => sum + Number(o.dp_amount || 0) + Number(o.repayment_amount || 0),
    0
  );
  const remainingPayment = grandTotalPrice - totalPaid;
  const isAllPaidOff = remainingPayment <= 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl text-gray-800 dark:bg-gray-900 dark:text-white print:p-0 print:shadow-none print:w-full print:max-w-none">

        {/* Tombol Aksi (Disembunyikan saat cetak PDF) */}
        <div className="flex justify-between items-center pb-6 border-b dark:border-gray-800 print:hidden">
          <h2 className="text-lg font-bold">
            Preview Invoice ({orders.length} Item)
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              🖨️ Cetak / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold rounded-lg border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* TAMPILAN FAKTUR INVOICE */}
        <div className="pt-6 space-y-6 print:pt-0">
          {/* Header Invoice */}
          <div className="flex justify-between items-start">
            <div>
              <img src="/images/logo/framelo-logo2.png" className="h-16 mb-2" alt="Framelo Logo" />
              <p className="text-xs text-gray-500">Custom 3D Map &amp; Frame Specialist</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 dark:bg-brand-500/10 uppercase">
                INVOICE
              </span>
              <p className="text-sm font-bold text-gray-800 dark:text-white mt-2">
                {orders.length > 1
                  ? `#INV-GRP-${Date.now().toString().slice(-4)}`
                  : `#${mainOrder.order_number}`}
              </p>
              <p className="text-xs text-gray-500">
                Tgl: {new Date(mainOrder.created_at).toLocaleDateString("id-ID")}
              </p>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-800" />

          {/* Info Customer & Pengiriman */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold uppercase text-gray-400 text-[10px]">Ditujukan Kepada:</p>
              <p className="font-bold text-sm text-gray-800 dark:text-white mt-1">{mainOrder.customer_name}</p>
              <p className="text-gray-600 dark:text-gray-300">{mainOrder.phone_number}</p>
              <p className="text-gray-500 mt-1 whitespace-pre-line">{mainOrder.address || "-"}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold uppercase text-gray-400 text-[10px]">Detail Pesanan:</p>
              <p className="text-gray-700 dark:text-gray-300 mt-1">Sumber: <span className="font-medium">{mainOrder.order_source}</span></p>
              <p className="text-gray-700 dark:text-gray-300">Pengiriman: <span className="font-medium">{mainOrder.shipping_method || "JNE"}</span></p>
              <p className="mt-2 font-bold text-emerald-600">
                {isAllPaidOff ? "STATUS: LUNAS" : "STATUS: BELUM LUNAS"}
              </p>
            </div>
          </div>

          {/* Tabel Rincian Item Produk & Add-ons */}
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500">
                <tr>
                  <th className="p-3">Item Produk &amp; Add-ons</th>
                  <th className="p-3 text-center">Kategori</th>
                  <th className="p-3 text-right">Harga Item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {orders.map((item, idx) => {
                  const itemTotal = Number(item.frame_price || 0) + Number(item.addons_price || 0);
                  return (
                    <tr key={item.id || idx}>
                      <td className="p-3 space-y-1">
                        <p className="font-bold text-gray-800 dark:text-white">
                          {idx + 1}. {item.product_name}
                        </p>
                        {item.add_ons && item.add_ons.length > 0 && (
                          <p className="text-gray-500 text-[11px] pl-3">
                            + Add-ons: {item.add_ons.join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-center font-medium text-purple-600 dark:text-purple-400 align-top">
                        {item.category || "PENDAKIAN"}
                      </td>
                      <td className="p-3 text-right font-semibold align-top">
                        Rp {itemTotal.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Perhitungan Total & Pembayaran */}
          <div className="flex justify-end text-xs">
            <div className="w-72 space-y-2 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal Produk ({orders.length} Item):</span>
                <span>Rp {totalFrameAndAddons.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Ongkos Kirim:</span>
                <span>Rp {totalShipping.toLocaleString("id-ID")}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-rose-500 font-medium">
                  <span>Total Diskon:</span>
                  <span>- Rp {totalDiscount.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-800 dark:text-white border-t pt-1 dark:border-gray-700">
                <span>Total Tagihan:</span>
                <span>Rp {grandTotalPrice.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Total Terbayar:</span>
                <span>Rp {totalPaid.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-2 dark:border-gray-700">
                <span>Sisa Pembayaran:</span>
                <span className={remainingPayment <= 0 ? "text-emerald-500" : "text-rose-500"}>
                  Rp {remainingPayment.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Catatan Kaki */}
          <div className="pt-4 border-t text-[11px] text-gray-400 text-center dark:border-gray-800">
            <p>Terima kasih telah memesan produk kustom di Framelo!</p>
            <p className="mt-0.5">Harap simpan invoice ini sebagai bukti transaksi resmi.</p>
          </div>
        </div>
      </div>
    </div>
  );
}