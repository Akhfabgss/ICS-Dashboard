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
            size: ${printMode === "receipt" ? "80mm auto" : "A4 portrait"};
          }

          /* KUNCI UTAMA: Menghapus scrollbar & margin penyebab lembar kosong ke-2 */
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100vh !important;
            overflow: hidden !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-area-container,
          .print-area-container * {
            visibility: visible !important;
          }

          /* 1. MODE CETAK INVOICE A4 */
          .mode-invoice-print {
            position: absolute !important;
            top: 5mm !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: 190mm !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* 2. MODE CETAK STRUK THERMAL (TENGAH ATAS) */
          .mode-receipt-print {
            position: absolute !important;
            top: 5mm !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: 78mm !important;
            max-width: 78mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .receipt-box-print {
            width: 100% !important;
            max-width: 78mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
          }

          .receipt-box-print * {
            color: #000 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* OVERLAY BACKDROP POPUP */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-4 print:p-0 print:static print:bg-white">
        {/* CONTAINER MODAL */}
        <div
          className={`print-area-container relative w-full max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl text-gray-800 dark:bg-gray-900 dark:text-white transition-all print:max-h-none print:h-auto print:shadow-none print:rounded-none print:p-0 ${printMode === "receipt"
              ? "max-w-md mode-receipt-print"
              : "max-w-2xl mode-invoice-print"
            }`}
        >
          {/* HEADER AKSI STICKY (Sembunyi saat Print) */}
          <div className="sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b gap-3 bg-white dark:bg-gray-900 dark:border-gray-800 rounded-t-2xl print:hidden">
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
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors cursor-pointer shadow-xs"
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

          {/* AREA BODI CONTENT */}
          <div className="overflow-y-auto p-5 space-y-4 print:overflow-hidden print:p-0">
            {/* ------------------- MODE 1: INVOICE A4 ------------------- */}
            {printMode === "invoice" && (
              <div className="space-y-3 print:space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <img src="/images/logo/framelo-logo2.png" className="h-9 mb-0.5" alt="Framelo Logo" />
                    <p className="text-[11px] text-gray-500">Custom 3D Map &amp; Frame Specialist</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-600 dark:bg-brand-500/10 uppercase">
                      INVOICE
                    </span>
                    <p className="text-xs font-bold text-gray-800 dark:text-white mt-0.5">
                      {orders.length > 1
                        ? `#INV-GRP-${Date.now().toString().slice(-4)}`
                        : `#${mainOrder.order_number}`}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Tgl: {new Date(mainOrder.created_at).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-800" />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-semibold uppercase text-gray-400 text-[9px]">Ditujukan Kepada:</p>
                    <p className="font-bold text-xs text-gray-800 dark:text-white mt-0.5">{mainOrder.customer_name}</p>
                    <p className="text-gray-600 dark:text-gray-300 text-[11px]">{mainOrder.phone_number}</p>
                    <p className="text-gray-500 text-[11px] mt-0.5 whitespace-pre-line">{mainOrder.address || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold uppercase text-gray-400 text-[9px]">Detail Pesanan:</p>
                    <p className="text-gray-700 dark:text-gray-300 text-[11px] mt-0.5">
                      Sumber: <span className="font-medium">{mainOrder.order_source}</span>
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 text-[11px]">
                      Pengiriman: <span className="font-medium">{mainOrder.shipping_method || "JNE"}</span>
                    </p>
                    <p className="mt-1 text-xs font-bold text-emerald-600">
                      {isAllPaidOff ? "STATUS: LUNAS" : "STATUS: BELUM LUNAS"}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="p-2">Rincian Item &amp; Komponen</th>
                        <th className="p-2 text-right">Harga Komponen</th>
                        <th className="p-2 text-right">Total Item</th>
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
                            <td className="p-2 space-y-0.5">
                              <p className="font-bold text-gray-800 dark:text-white text-xs">
                                {idx + 1}. {item.product_name}
                              </p>
                              {hasAddons && (
                                <p className="pl-2 text-[10px] text-gray-600 dark:text-gray-400">
                                  • Add-ons ({item.add_ons.join(", ")})
                                </p>
                              )}
                            </td>
                            <td className="p-2 text-right align-top space-y-0.5 text-xs">
                              <p className="font-semibold text-gray-800 dark:text-gray-200">
                                Rp {framePrice.toLocaleString("id-ID")}
                              </p>
                              {hasAddons && (
                                <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                                  Rp {addonsPrice.toLocaleString("id-ID")}
                                </p>
                              )}
                            </td>
                            <td className="p-2 text-right font-bold text-xs align-top text-brand-600 dark:text-brand-400">
                              Rp {itemTotal.toLocaleString("id-ID")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end text-xs">
                  <div className="w-60 space-y-1 p-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400 text-[11px]">
                      <span>Subtotal Produk ({orders.length} Item):</span>
                      <span>Rp {totalFrameAndAddons.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400 text-[11px]">
                      <span>Ongkos Kirim:</span>
                      <span>Rp {totalShipping.toLocaleString("id-ID")}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-rose-500 font-medium text-[11px]">
                        <span>Total Diskon:</span>
                        <span>- Rp {totalDiscount.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-800 dark:text-white border-t pt-1 dark:border-gray-700 text-[11px]">
                      <span>Total Tagihan:</span>
                      <span>Rp {grandTotalPrice.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-medium text-[11px]">
                      <span>Total Terbayar:</span>
                      <span>Rp {totalPaid.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold border-t pt-1 dark:border-gray-700">
                      <span>Sisa Pembayaran:</span>
                      <span className={remainingPayment <= 0 ? "text-emerald-500" : "text-rose-500"}>
                        Rp {remainingPayment.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t text-[10px] text-gray-400 text-center dark:border-gray-800">
                  <p>Terima kasih telah memesan produk kustom di Framelo!</p>
                  <p className="mt-0.5">Harap simpan invoice ini sebagai bukti transaksi resmi.</p>
                </div>
              </div>
            )}

            {/* ------------------- MODE 2: STRUK THERMAL ------------------- */}
            {printMode === "receipt" && (
              <div className="w-full flex justify-center print:block">
                <div className="receipt-box-print w-full max-w-[320px] p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 font-mono text-xs text-gray-800 dark:text-gray-200 space-y-2.5 print:bg-white print:border-none print:p-0">
                  <div className="text-center space-y-0.5 border-b pb-2.5 border-dashed border-gray-400 dark:border-gray-600">
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

                  <div className="space-y-2 border-b pb-2.5 border-dashed border-gray-400 dark:border-gray-600 text-[11px]">
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

                  <div className="space-y-1 text-[11px] font-medium border-b pb-2.5 border-dashed border-gray-400 dark:border-gray-600">
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

                  <div className="text-center space-y-0.5 pt-0.5">
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
      </div>
    </>
  );
}