"use client";

import React, { useState } from "react";
import { Order } from "@/types/order";

interface InvoiceModalProps {
  orders: Order[];
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoicePrintModal({ orders, isOpen, onClose }: InvoiceModalProps) {
  const [printMode, setPrintMode] = useState<"invoice" | "receipt">("invoice");

  if (!isOpen || orders.length === 0) return null;

  const mainOrder = orders[0];

  const handlePrint = () => {
    window.print();
  };

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
    <>
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }

          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }

          /* Sembunyikan seluruh elemen dashboard */
          body * {
            visibility: hidden !important;
          }

          /* Hanya tampilkan area yang dicetak */
          .print-area,
          .print-area * {
            visibility: visible !important;
          }

          .print-area {
            /* Gunakan relative/static agar margin auto untuk horizontal centering berfungsi */
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 auto !important; /* Posisikan ke tengah layar horizontal */
            padding-top: 10mm !important;
            background: #fff !important;
            box-shadow: none !important;
          }

          /* Pengaturan lebar untuk Mode Invoice (A4) */
          .print-area {
            width: 90% !important;
            max-width: 800px !important;
          }

          /* Tampilan Khusus Hasil Cetak Struk Thermal (80mm) */
          .receipt-mode-print {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important; /* Memastikan konten struk tetap di tengah */
            padding: 2mm !important;
            border: none !important;
            box-shadow: none !important;
            font-size: 10px !important;
            line-height: 1.3 !important;
            color: #000 !important;
          }

          .receipt-mode-print * {
            color: #000 !important;
          }
        }
      `}</style>

      {/* MODAL CONTAINER DENGAN OVERLAY HITAM */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 overflow-y-auto print:p-0 print:static print:bg-white">
        <div
          className={`print-area relative w-full rounded-2xl bg-white p-6 shadow-2xl text-gray-800 dark:bg-gray-900 dark:text-white transition-all print:p-0 print:shadow-none ${printMode === "receipt" ? "max-w-md" : "max-w-2xl"
            }`}
        >
          {/* BARIS TOMBOL TOGGLE MODE & AKSI */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b gap-3 dark:border-gray-800 print:hidden">
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setPrintMode("invoice")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${printMode === "invoice"
                  ? "bg-white text-gray-800 shadow-xs dark:bg-gray-700 dark:text-white font-bold"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Invoice
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("receipt")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${printMode === "receipt"
                  ? "bg-white text-brand-600 shadow-xs dark:bg-gray-700 dark:text-brand-400 font-bold"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Struk
              </button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors cursor-pointer"
              >
                🖨️ Cetak ({printMode === "invoice" ? "Invoice" : "Struk"})
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold rounded-lg border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>

          {/* ------------------- MODE 1: TAMPILAN INVOICE A4 ------------------- */}
          {printMode === "invoice" && (
            <div className="pt-6 space-y-6 print:pt-0">
              <div className="flex justify-between items-start">
                <div>
                  <img src="/images/logo/framelo-logo2.png" className="h-12 mb-1" alt="Framelo Logo" />
                  <p className="text-xs text-gray-500">Custom 3D Map &amp; Frame Specialist</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 dark:bg-brand-500/10 uppercase">
                    INVOICE
                  </span>
                  <p className="text-sm font-bold text-gray-800 dark:text-white mt-1">
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

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold uppercase text-gray-400 text-[10px]">Ditujukan Kepada:</p>
                  <p className="font-bold text-sm text-gray-800 dark:text-white mt-1">{mainOrder.customer_name}</p>
                  <p className="text-gray-600 dark:text-gray-300">{mainOrder.phone_number}</p>
                  <p className="text-gray-500 mt-1 whitespace-pre-line">{mainOrder.address || "-"}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold uppercase text-gray-400 text-[10px]">Detail Pesanan:</p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Sumber: <span className="font-medium">{mainOrder.order_source}</span>
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    Pengiriman: <span className="font-medium">{mainOrder.shipping_method || "JNE"}</span>
                  </p>
                  <p className="mt-2 font-bold text-emerald-600">
                    {isAllPaidOff ? "STATUS: LUNAS" : "STATUS: BELUM LUNAS"}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="p-3">Rincian Item &amp; Komponen</th>
                      <th className="p-3 text-right">Harga Komponen</th>
                      <th className="p-3 text-right">Total Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {orders.map((item, idx) => {
                      const framePrice = Number(item.frame_price || 0);
                      const addonsPrice = Number(item.addons_price || 0);
                      const itemTotal = framePrice + addonsPrice;
                      const hasAddons = item.add_ons && item.add_ons.length > 0;

                      return (
                        <tr key={item.id || idx}>
                          <td className="p-3 space-y-1">
                            <p className="font-bold text-gray-800 dark:text-white text-sm">
                              {idx + 1}. {item.product_name}
                            </p>
                            {hasAddons && (
                              <p className="pl-3 text-[11px] text-gray-600 dark:text-gray-400">
                                • Add-ons ({item.add_ons.join(", ")})
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-right align-top space-y-1 text-xs">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                              Rp {framePrice.toLocaleString("id-ID")}
                            </p>
                            {hasAddons && (
                              <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                                Rp {addonsPrice.toLocaleString("id-ID")}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-sm align-top text-brand-600 dark:text-brand-400">
                            Rp {itemTotal.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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

              <div className="pt-4 border-t text-[11px] text-gray-400 text-center dark:border-gray-800">
                <p>Terima kasih telah memesan produk kustom di Framelo!</p>
                <p className="mt-0.5">Harap simpan invoice ini sebagai bukti transaksi resmi.</p>
              </div>
            </div>
          )}

          {/* ------------------- MODE 2: TAMPILAN PREVIEW STRUK THERMAL ------------------- */}
          {printMode === "receipt" && (
            <div className="pt-4 flex justify-center">
              <div className="receipt-mode-print w-full max-w-[320px] p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 font-mono text-xs text-gray-800 dark:text-gray-200 space-y-3">
                {/* Header Struk */}
                <div className="text-center space-y-0.5 border-b pb-3 border-dashed border-gray-400 dark:border-gray-600">
                  <h3 className="font-bold text-sm tracking-widest uppercase text-gray-900 dark:text-white">
                    FRAMELO
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Custom 3D Map &amp; Frame</p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(mainOrder.created_at).toLocaleString("id-ID")}
                  </p>
                  <p className="text-[11px] font-bold mt-1 text-gray-900 dark:text-white">
                    {orders.length > 1
                      ? `#STRUK-GRP-${Date.now().toString().slice(-4)}`
                      : `#${mainOrder.order_number}`}
                  </p>
                </div>

                {/* Info Pelanggan */}
                <div className="border-b pb-2 border-dashed border-gray-400 dark:border-gray-600 text-[11px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Pelanggan :</span>
                    <span className="font-semibold">{mainOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>No. WA :</span>
                    <span>{mainOrder.phone_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kurir :</span>
                    <span>{mainOrder.shipping_method || "JNE"}</span>
                  </div>
                </div>

                {/* Daftar Rincian Barang */}
                <div className="space-y-2 border-b pb-3 border-dashed border-gray-400 dark:border-gray-600 text-[11px]">
                  {orders.map((item, idx) => {
                    const framePrice = Number(item.frame_price || 0);
                    const addonsPrice = Number(item.addons_price || 0);
                    const itemTotal = framePrice + addonsPrice;
                    const hasAddons = item.add_ons && item.add_ons.length > 0;

                    return (
                      <div key={item.id || idx} className="space-y-0.5">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {idx + 1}. {item.product_name}
                        </div>
                        <div className="flex justify-between pl-2 text-gray-600 dark:text-gray-400">
                          <span> Bingkai</span>
                          <span>{framePrice.toLocaleString("id-ID")}</span>
                        </div>
                        {hasAddons && (
                          <div className="flex justify-between pl-2 text-gray-600 dark:text-gray-400">
                            <span> Addons ({item.add_ons.join(", ")})</span>
                            <span>{addonsPrice.toLocaleString("id-ID")}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold pl-2 pt-0.5 text-gray-900 dark:text-white">
                          <span>Subtotal:</span>
                          <span>Rp {itemTotal.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ringkasan Pembayaran */}
                <div className="space-y-1 text-[11px] font-medium border-b pb-3 border-dashed border-gray-400 dark:border-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rp {totalFrameAndAddons.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ongkir</span>
                    <span>Rp {totalShipping.toLocaleString("id-ID")}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-rose-500">
                      <span>Diskon</span>
                      <span>-Rp {totalDiscount.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11.5px] font-bold pt-1 border-t border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                    <span>TOTAL</span>
                    <span>Rp {grandTotalPrice.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between pt-0.5">
                    <span>Terbayar</span>
                    <span>Rp {totalPaid.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-[11.5px] font-bold pt-1 text-gray-900 dark:text-white">
                    <span>SISA</span>
                    <span className={remainingPayment <= 0 ? "text-emerald-500" : "text-rose-500"}>
                      Rp {remainingPayment.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Status & Footer */}
                <div className="text-center space-y-0.5 pt-1">
                  <p className="font-bold text-xs tracking-wider text-gray-900 dark:text-white">
                    *** {isAllPaidOff ? "LUNAS" : "BELUM LUNAS"} ***
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Terima kasih atas pesanan Anda!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}