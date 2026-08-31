"use client";

import React from "react";
import { Order } from "@/types/order";

interface InvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoicePrintModal({ order, isOpen, onClose }: InvoiceModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalPaid = Number(order.dp_amount || 0) + Number(order.repayment_amount || 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      {/* Container Faktur Invoice */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl text-gray-800 dark:bg-gray-900 dark:text-white print:p-0 print:shadow-none print:w-full print:max-w-none">
        
        {/* Tombol Aksi Modal (Disembunyikan saat dicetak) */}
        <div className="flex justify-between items-center pb-6 border-b dark:border-gray-800 print:hidden">
          <h2 className="text-lg font-bold">Preview Invoice</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              🖨️ Cetak / Save PDF
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold rounded-lg border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* TAMPILAN RESMI INVOICE */}
        <div className="pt-6 space-y-6 print:pt-0">
          {/* Header Invoice */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black text-brand-600 tracking-wider">FRAMELO</h1>
              <p className="text-xs text-gray-500">Custom 3D Map & Frame Specialist</p>
              <p className="text-xs text-gray-500 mt-1">WhatsApp: +62 812-XXXX-XXXX</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 dark:bg-brand-500/10 uppercase">
                INVOICE
              </span>
              <p className="text-sm font-bold text-gray-800 dark:text-white mt-2">#{order.order_number}</p>
              <p className="text-xs text-gray-500">Tgl: {new Date(order.created_at).toLocaleDateString("id-ID")}</p>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-800" />

          {/* Info Customer & Pengiriman */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold uppercase text-gray-400 text-[10px]">Ditujukan Kepada:</p>
              <p className="font-bold text-sm text-gray-800 dark:text-white mt-1">{order.customer_name}</p>
              <p className="text-gray-600 dark:text-gray-300">{order.phone_number}</p>
              <p className="text-gray-500 mt-1 whitespace-pre-line">{order.address || "-"}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold uppercase text-gray-400 text-[10px]">Detail Pesanan:</p>
              <p className="text-gray-700 dark:text-gray-300 mt-1">Sumber: <span className="font-medium">{order.order_source}</span></p>
              <p className="text-gray-700 dark:text-gray-300">Pengiriman: <span className="font-medium">{order.shipping_method || "JNE"}</span></p>
              <p className="mt-2 font-bold text-emerald-600">
                {order.is_paid_off ? "STATUS: LUNAS" : "STATUS: BELUM LUNAS"}
              </p>
            </div>
          </div>

          {/* Tabel Rincian Produk */}
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500">
                <tr>
                  <th className="p-3">Deskripsi Produk</th>
                  <th className="p-3 text-right">Harga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="p-3">
                    <p className="font-bold text-gray-800 dark:text-white">{order.product_name}</p>
                    <p className="text-gray-400 text-[11px]">Kategori: {order.category}</p>
                  </td>
                  <td className="p-3 text-right font-semibold">
                    Rp {order.frame_price.toLocaleString("id-ID")}
                  </td>
                </tr>

                {/* Addons List */}
                {order.add_ons && order.add_ons.length > 0 && (
                  <tr>
                    <td className="p-3">
                      <p className="font-medium text-gray-700 dark:text-gray-300">Tambahan / Add-ons:</p>
                      <ul className="list-disc list-inside text-gray-500 text-[11px]">
                        {order.add_ons.map((addon, i) => (
                          <li key={i}>{addon}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-3 text-right font-semibold">
                      Rp {order.addons_price.toLocaleString("id-ID")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total & Perhitungan Pembayaran */}
          <div className="flex justify-end text-xs">
            <div className="w-64 space-y-2 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal:</span>
                <span>Rp {order.total_price.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Total Terbayar:</span>
                <span>Rp {totalPaid.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-2 dark:border-gray-700">
                <span>Sisa Pembayaran:</span>
                <span className={order.remaining_payment <= 0 ? "text-emerald-500" : "text-rose-500"}>
                  Rp {order.remaining_payment.toLocaleString("id-ID")}
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