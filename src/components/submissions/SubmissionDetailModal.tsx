"use client";

import React from "react";
import { Submission, WORKFLOW_STATUS_CONFIG } from "@/types/submission";
import {
  X,
  Award,
  FileText,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface Props {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInvoice: (sub: Submission) => void;
  onOpenCertReport: (sub: Submission) => void;
  onEdit: (sub: Submission) => void;
}

export default function SubmissionDetailModal({
  submission,
  isOpen,
  onClose,
  onOpenInvoice,
  onOpenCertReport,
  onEdit,
}: Props) {
  if (!isOpen || !submission) return null;

  const statusConf =
    WORKFLOW_STATUS_CONFIG[submission.workflow_status] ||
    WORKFLOW_STATUS_CONFIG["Dalam Daftar"];
  const { centering, corners, edges, surface } = submission.sub_grades;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Detail Submisi #{submission.order_no}
              </h3>
              <p className="text-[11px] text-gray-500">
                Cert ID: <strong className="font-mono text-brand-600">{submission.cert_id}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(submission)}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer"
            >
              Edit / Grading
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
          {/* Status & Action Buttons Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                Status Alur Grading:
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
              >
                {submission.workflow_status}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenInvoice(submission)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-brand-600" />
                Cetak Invoice
              </button>
              <button
                onClick={() => onOpenCertReport(submission)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs cursor-pointer"
              >
                <Award className="w-4 h-4" />
                Cetak Laporan Grading (Trifold)
              </button>
            </div>
          </div>

          {/* Card Info & Grade Badge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-[10px] font-bold tracking-wider text-gray-400">
                Kartu yang Disubmisi
              </span>
              <h2 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                {submission.card_name}
              </h2>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600 dark:text-gray-400">
                <div>Franchise: <strong className="text-brand-600">{submission.tcg_category}</strong></div>
                <div>Set: <strong>{submission.card_set}</strong></div>
                <div>Tahun: <strong>{submission.card_year || "Modern"}</strong></div>
                <div>Layanan: <strong>{submission.service_tier}</strong></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 text-center flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold tracking-wider text-purple-700 dark:text-purple-400">
                Hasil Grade Final
              </span>
              <div className="text-3xl font-black text-purple-700 dark:text-purple-300 mt-1">
                {submission.final_grade || "10"}
              </div>
              <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                {submission.grade_label || "Gem Mint 10"}
              </div>
            </div>
          </div>

          {/* 4 Sub-Grades */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center justify-between">
              <span>Hasil 4 Sub-Grades Forensik</span>
              <span className="text-[11px] font-mono text-brand-600 font-semibold">
                Cert: {submission.cert_id}
              </span>
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-[10px] text-gray-500 block">Centering</span>
                <span className="text-lg font-black text-gray-900 dark:text-white block mt-0.5">
                  {centering || 10}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-[10px] text-gray-500 block">Corners</span>
                <span className="text-lg font-black text-gray-900 dark:text-white block mt-0.5">
                  {corners || 9.5}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-[10px] text-gray-500 block">Edges</span>
                <span className="text-lg font-black text-gray-900 dark:text-white block mt-0.5">
                  {edges || 10}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span className="text-[10px] text-gray-500 block">Surface</span>
                <span className="text-lg font-black text-gray-900 dark:text-white block mt-0.5">
                  {surface || 9.5}
                </span>
              </div>
            </div>

            {submission.grader_notes && (
              <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300">
                <strong className="text-gray-800 dark:text-white block mb-0.5">
                  Catatan Senior Grader:
                </strong>
                <p className="italic">{submission.grader_notes}</p>
              </div>
            )}

            {submission.forensic_photos_url && (
              <a
                href={submission.forensic_photos_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 dark:text-brand-400 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Arsip Foto Forensik Mikroskop (Google Drive)
              </a>
            )}
          </div>

          {/* Collector & Courier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <span className="font-bold text-gray-700 dark:text-gray-300 block mb-2">
                Data Kolektor:
              </span>
              <p className="font-semibold text-gray-900 dark:text-white">
                {submission.collector_name}
              </p>
              <p className="text-gray-500 mt-1">Telp: {submission.phone_number}</p>
              <p className="text-gray-500 mt-0.5">{submission.address || "Direct Lab Drop-off"}</p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <span className="font-bold text-gray-700 dark:text-gray-300 block mb-2">
                Logistik &amp; Pembayaran:
              </span>
              <p className="text-gray-700 dark:text-gray-300">
                Kurir: <strong>{submission.courier}</strong> (Resi: {submission.tracking_number || "-"})
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-1">
                Status Bayar:{" "}
                <strong className={submission.payment_status === "LUNAS" ? "text-emerald-600" : "text-amber-600"}>
                  {submission.payment_status}
                </strong>
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-1">
                Total Biaya: <strong>Rp {submission.total_price.toLocaleString("id-ID")}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}