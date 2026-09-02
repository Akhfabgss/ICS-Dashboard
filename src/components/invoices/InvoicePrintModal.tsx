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

  // Akumulasi Keseluruhan Item
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
      {/* STYLE CSS UTUM KHUSUS SAAT CETAK (PRINT MEDIA STYLES) */}
      <style jsx global>{`
        @media print {
          /* Menyembunyikan elemen latar belakang default browser */
          body {
            background: white !important;
          }

          ${printMode === "receipt"
          ? `
            /* PENGATURAN KERTAS KHUSUS STRUK THERMAL (80mm) */
            @page {
              size: 80mm auto;
              margin: 0;
            }

            .receipt-container {
              width: 78mm !important;
              max-width: 78mm !important;
              margin: 0 auto !important;
              padding: 5mm !important;
              box-shadow: none !important;
              border: none !important;
            }
          `
          : `
            /* PENGATURAN KERTAS INVOICE (A4) */
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          `}
        }
      `}</style>

      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto print:bg-white print:p-0 print:static print:inset-auto">
        <div
          className={`relative w-full rounded-2xl bg-white p-6 shadow-2xl text-gray-800 dark:bg-gray-900 dark:text-white print:p-0 print:shadow-none ${printMode === "receipt"
            ? "max-w-md font-mono receipt-container print:w-[78mm] print:max-w-[78mm]"
            : "max-w-2xl print:w-full print:max-w-none"
            }`}
        >
          {/* BARIS TOMBOL AKSI & TOGGLE MODE (TIDAK IKUT DICETAK) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b gap-3 dark:border-gray-800 print:hidden">
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setPrintMode("invoice")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${printMode === "invoice"
                  ? "bg-white text-gray-800 shadow-xs dark:bg-gray-700 dark:text-white font-bold"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Invoice
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("receipt")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${printMode === "receipt"
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
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                🖨️ Cetak ({printMode === "invoice" ? "Invoice" : "Struk"})
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

          {/* ------------------- MODE 1: TAMPILAN INVOICE (A4) ------------------- */}
          {printMode === "invoice" && (
            <div className="pt-6 space-y-6 print:pt-0">
              {/* Header Invoice */}
              <div className="flex justify-between items-start">
                <div>
                  <img src="/images/logo/framelo-logo2.png" className="h-14 mb-1" alt="Framelo Logo" />
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

              {/* Info Customer */}
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

              {/* Tabel Rincian */}
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

              {/* Footer Calculation */}
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

          {/* ------------------- MODE 2: TAMPILAN STRUK THERMAL ------------------- */}
          {printMode === "receipt" && (
            <div className="pt-4 space-y-3 text-xs font-mono text-black dark:text-white print:pt-0 print:text-black print:bg-white">
              {/* Header Struk */}
              <div className="text-center space-y-0.5 border-b pb-3 border-dashed border-gray-400">
                <h3 className="font-bold text-base tracking-widest uppercase">FRAMELO</h3>
                <p className="text-[10px] text-gray-500">Custom 3D Map &amp; Frame</p>
                <p className="text-[10px] text-gray-400">
                  {new Date(mainOrder.created_at).toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] font-bold mt-1">
                  {orders.length > 1
                    ? `#STRUK-GRP-${Date.now().toString().slice(-4)}`
                    : `#${mainOrder.order_number}`}
                </p>
              </div>

              {/* Info Pelanggan */}
              <div className="border-b pb-2 border-dashed border-gray-400 text-[11px] space-y-0.5">
                <p>Pelanggan : {mainOrder.customer_name}</p>
                <p>No. WA    : {mainOrder.phone_number}</p>
                <p>Kurir     : {mainOrder.shipping_method || "JNE"}</p>
              </div>

              {/* Daftar Rincian Barang */}
              <div className="space-y-2 border-b pb-3 border-dashed border-gray-400 text-[11px]">
                {orders.map((item, idx) => {
                  const framePrice = Number(item.frame_price || 0);
                  const addonsPrice = Number(item.addons_price || 0);
                  const itemTotal = framePrice + addonsPrice;
                  const hasAddons = item.add_ons && item.add_ons.length > 0;

                  return (
                    <div key={item.id || idx} className="space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>{idx + 1}. {item.product_name}</span>
                      </div>
                      <div className="flex justify-between pl-3 text-gray-600">
                        <span>• Bingkai</span>
                        <span>{framePrice.toLocaleString("id-ID")}</span>
                      </div>
                      {hasAddons && (
                        <div className="flex justify-between pl-3 text-gray-600">
                          <span>• Addons ({item.add_ons.join(", ")})</span>
                          <span>{addonsPrice.toLocaleString("id-ID")}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold pl-3 pt-0.5">
                        <span>Subtotal Item:</span>
                        <span>Rp {itemTotal.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ringkasan Pembayaran */}
              <div className="space-y-1 text-[11px] font-semibold border-b pb-3 border-dashed border-gray-400">
                <div className="flex justify-between">
                  <span>Subtotal ({orders.length} Item)</span>
                  <span>Rp {totalFrameAndAddons.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ongkir</span>
                  <span>Rp {totalShipping.toLocaleString("id-ID")}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon</span>
                    <span>-Rp {totalDiscount.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-300">
                  <span>TOTAL</span>
                  <span>Rp {grandTotalPrice.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span>Terbayar</span>
                  <span>Rp {totalPaid.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1">
                  <span>SISA</span>
                  <span>Rp {remainingPayment.toLocaleString("id-ID")}</span>
                </div>
              </div>

              {/* Status & Footer */}
              <div className="text-center space-y-1 pt-1">
                <p className="font-bold text-sm tracking-wider">
                  *** {isAllPaidOff ? "LUNAS" : "BELUM LUNAS"} ***
                </p>
                <p className="text-[10px] text-gray-500">Terima kasih atas pesanan Anda!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}