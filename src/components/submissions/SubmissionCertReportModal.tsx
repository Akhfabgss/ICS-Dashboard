"use client";

import React, { useRef } from "react";
import { Submission } from "@/types/submission";
import { X, Printer, Award, ShieldCheck, CheckCircle2 } from "lucide-react";

interface Props {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubmissionCertReportModal({ submission, isOpen, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !submission) return null;

  const handlePrint = () => {
    window.print();
  };

  const { centering = 0, corners = 0, edges = 0, surface = 0 } = submission.sub_grades || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 my-8 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Preview Sertifikat Trifold Grading Report</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Sertifikat
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Trifold Certificate Body */}
        <div ref={printRef} className="p-8 space-y-6 bg-white dark:bg-white text-gray-900 font-sans">
          {/* Top Header Logo */}
          <div className="text-center space-y-1 border-b-2 border-purple-600 pb-4">
            <div className="inline-flex items-center justify-center gap-2 text-purple-950 font-black text-xl">
              <Award className="w-7 h-7 text-purple-600" />
              INDONESIA COLLECTIBLE STANDARD
            </div>
            <p className="text-xs font-bold tracking-widest text-purple-700 uppercase">Official Card Grading &amp; Forensic Assessment Report</p>
            <p className="text-[10px] font-mono text-gray-500">CERTIFICATE ID: {submission.cert_id}</p>
          </div>

          {/* Main Grade Highlight Box */}
          <div className="grid grid-cols-3 gap-4 bg-purple-50 p-6 rounded-2xl border border-purple-200 items-center">
            <div className="col-span-2 space-y-2">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Kartu Terverifikasi</span>
              <h2 className="text-xl font-black text-gray-900">{submission.card_name}</h2>
              <div className="text-xs text-gray-700 space-y-0.5">
                <p>Franchise: <strong>{submission.tcg_category}</strong></p>
                <p>Set: <strong>{submission.card_set} ({submission.card_year || "Modern"})</strong></p>
                <p>Assigned Senior Grader: <strong>{submission.assigned_grader}</strong></p>
              </div>
            </div>

            <div className="text-center border-l-2 border-purple-200 pl-4">
              <span className="text-[10px] font-bold text-purple-700 uppercase block">Grade Final</span>
              <div className="text-5xl font-black text-purple-700 my-1">{submission.final_grade || "0"}</div>
              <span className="inline-block px-3 py-1 rounded-full bg-purple-600 text-white font-bold text-xs">
                {submission.grade_label || "Pending"}
              </span>
            </div>
          </div>

          {/* 4 Subgrades Breakdown */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Breakdown 4 Sub-Grades Forensik (Skala 1 - 10)
            </h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] font-semibold text-gray-500 uppercase block">Centering</span>
                <span className="text-xl font-black text-gray-900 mt-1 block">{centering}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] font-semibold text-gray-500 uppercase block">Corners</span>
                <span className="text-xl font-black text-gray-900 mt-1 block">{corners}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] font-semibold text-gray-500 uppercase block">Edges</span>
                <span className="text-xl font-black text-gray-900 mt-1 block">{edges}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] font-semibold text-gray-500 uppercase block">Surface</span>
                <span className="text-xl font-black text-gray-900 mt-1 block">{surface}</span>
              </div>
            </div>
          </div>

          {/* Grader Notes */}
          {submission.grader_notes && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
              <span className="font-bold text-gray-900 block">Catatan Inspeksi Mikroskop Optik:</span>
              <p className="italic text-gray-700">{submission.grader_notes}</p>
            </div>
          )}

          {/* Bottom Security Seals */}
          <div className="border-t border-gray-200 pt-4 flex justify-between items-end text-[10px] text-gray-500">
            <div>
              <p className="font-semibold text-gray-800">Autentisitas Terjamin (NFC Encrypted)</p>
              <p>Pindai chip RFID NFC pada slab untuk verifikasi sertifikat ini secara live.</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-gray-800">LAB SEAL: OFFICIAL ICS CERTIFIED</p>
              <p>Tanggal Terbit: {new Date(submission.created_at).toLocaleDateString("id-ID")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}