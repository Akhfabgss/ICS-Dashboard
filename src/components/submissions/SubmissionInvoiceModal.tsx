"use client";

import React, { useRef } from "react";
import { Submission } from "@/types/submission";
import { X, Printer, ShieldCheck } from "lucide-react";

interface Props {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubmissionInvoiceModal({ submission, isOpen, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !submission) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 my-8 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Preview Invoice Submisi A4</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Simpan PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body Template */}
        <div ref={printRef} className="p-8 space-y-6 text-xs text-gray-800 bg-white dark:bg-white dark:text-gray-900 font-sans">
          {/* Top Invoice Header */}
          <div className="flex justify-between items-start border-b-2 border-brand-600 pb-4">
            <div>
              <div className="flex items-center gap-2 text-brand-900 font-black text-lg">
                <ShieldCheck className="w-6 h-6 text-brand-600" />
                ICS LABS INDONESIA
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">Indonesia Collectible Standard Lab &amp; Registry</p>
              <p className="text-[10px] text-gray-500">Jakarta, Indonesia • support@icsgrading.id</p>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-black text-brand-600">INVOICE SUBMISI</h1>
              <p className="font-mono text-xs font-bold text-gray-700 mt-1">No: {submission.order_no}</p>
              <p className="text-[10px] text-gray-500">Tanggal: {new Date(submission.created_at).toLocaleDateString("id-ID")}</p>
            </div>
          </div>

          {/* Info Tagihan & Kolektor */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Ditagihkan Kepada</span>
              <p className="font-bold text-gray-900 text-sm">{submission.collector_name}</p>
              <p className="text-gray-600 mt-0.5">WhatsApp: {submission.phone_number}</p>
              <p className="text-gray-600 mt-0.5">{submission.address || "Drop-off Langsung di Lab"}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Detail Layanan</span>
              <p className="font-semibold text-gray-900">{submission.service_tier}</p>
              <p className="text-gray-600 mt-0.5">Kurir Pengiriman: {submission.courier}</p>
              <p className="text-gray-600 mt-0.5">Nomor Cert ID: <span className="font-mono font-bold text-brand-600">{submission.cert_id}</span></p>
            </div>
          </div>

          {/* Table Item Submisi */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-100 font-bold text-gray-700">
                <th className="py-2 px-3">Deskripsi Kartu</th>
                <th className="py-2 px-3">Franchise &amp; Set</th>
                <th className="py-2 px-3 text-center">Jumlah</th>
                <th className="py-2 px-3 text-right">Biaya (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3 px-3 font-bold text-gray-900">{submission.card_name}</td>
                <td className="py-3 px-3 text-gray-600">{submission.tcg_category} • {submission.card_set}</td>
                <td className="py-3 px-3 text-center font-semibold">1 Pcs</td>
                <td className="py-3 px-3 text-right font-bold">Rp {submission.total_price.toLocaleString("id-ID")}</td>
              </tr>
            </tbody>
          </table>

          {/* Summary Total */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-2 border-t border-gray-300 pt-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Total Biaya Submisi:</span>
                <span className="font-bold">Rp {submission.total_price.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Uang Muka (DP):</span>
                <span className="font-semibold">Rp {(submission.dp_amount || 0).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-gray-300 pt-2 text-brand-900">
                <span>Sisa Pembayaran:</span>
                <span>Rp {(submission.remaining_payment || 0).toLocaleString("id-ID")}</span>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${submission.payment_status === "LUNAS" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  STATUS: {submission.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-gray-200 pt-4 text-[10px] text-gray-500 text-center space-y-1">
            <p className="font-semibold text-gray-700">Terima kasih atas kepercayaan Anda menggunakan layanan autentikasi ICS.</p>
            <p>Slab akrilik dilindungi oleh teknologi Acoustic Welding &amp; Enkripsi RFID NFC tamper-proof.</p>
          </div>
        </div>
      </div>
    </div>
  );
}