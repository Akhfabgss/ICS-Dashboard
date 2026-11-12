"use client";

import React, { useState, useEffect } from "react";
import {
  Submission,
  WorkflowStatus,
  PaymentStatus,
  TCGCategory,
  generateCertId,
  calculateFinalGrade,
  WORKFLOW_STATUS_CONFIG,
} from "@/types/submission";
import { X, Sparkles, Wand2, ShieldCheck, Award } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Submission>) => void;
  initialData?: Submission | null;
}

const TCG_CATEGORIES: TCGCategory[] = [
  "Pokémon",
  "One Piece",
  "Yu-Gi-Oh!",
  "Magic: The Gathering",
  "Dragon Ball",
  "Sports Cards",
  "Weiss Schwarz",
  "Other",
];

const SERVICE_TIERS = [
  "Standard Grading (7-14 Hari)",
  "Express Grading (3 Hari)",
  "Super Express (24 Jam)",
  "Bulk Collector Pass (Min. 25 Kartu)",
];

const COURIERS = [
  "JNE YES",
  "JNE Reguler",
  "SiCepat Best",
  "J&T Express",
  "Paxel Insured",
  "Drop-off Lab",
];

const GRADERS = [
  "Budi Santoso (Senior)",
  "Rian Hendrawan (Senior)",
  "Dimas Setiawan",
  "Belum Ditugaskan",
];

export default function SubmissionFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: Props) {
  const [collectorName, setCollectorName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");

  const [cardName, setCardName] = useState("");
  const [cardSet, setCardSet] = useState("");
  const [cardYear, setCardYear] = useState("2024");
  const [tcgCategory, setTcgCategory] = useState<TCGCategory>("Pokémon");
  const [serviceTier, setServiceTier] = useState(SERVICE_TIERS[0]);

  const [totalPrice, setTotalPrice] = useState<number>(350000);
  const [dpAmount, setDpAmount] = useState<number>(350000);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("LUNAS");

  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("Dalam Daftar");
  const [courier, setCourier] = useState("JNE YES");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [assignedGrader, setAssignedGrader] = useState(GRADERS[0]);

  // Sub-Grades
  const [centering, setCentering] = useState<number>(10);
  const [corners, setCorners] = useState<number>(9.5);
  const [edges, setEdges] = useState<number>(10);
  const [surface, setSurface] = useState<number>(9.5);

  const [certId, setCertId] = useState("");
  const [forensicPhotosUrl, setForensicPhotosUrl] = useState("");
  const [graderNotes, setGraderNotes] = useState("");

  // Populate or reset
  useEffect(() => {
    if (initialData) {
      setCollectorName(initialData.collector_name || "");
      setPhoneNumber(initialData.phone_number || "");
      setAddress(initialData.address || "");
      setCardName(initialData.card_name || "");
      setCardSet(initialData.card_set || "");
      setCardYear(initialData.card_year || "2024");
      setTcgCategory(initialData.tcg_category || "Pokémon");
      setServiceTier(initialData.service_tier || SERVICE_TIERS[0]);
      setTotalPrice(initialData.total_price || 350000);
      setDpAmount(initialData.dp_amount || 350000);
      setPaymentStatus(initialData.payment_status || "LUNAS");
      setWorkflowStatus(initialData.workflow_status || "Dalam Daftar");
      setCourier(initialData.courier || "JNE YES");
      setTrackingNumber(initialData.tracking_number || "");
      setAssignedGrader(initialData.assigned_grader || GRADERS[0]);

      setCentering(initialData.sub_grades?.centering || 10);
      setCorners(initialData.sub_grades?.corners || 9.5);
      setEdges(initialData.sub_grades?.edges || 10);
      setSurface(initialData.sub_grades?.surface || 9.5);

      setCertId(initialData.cert_id || generateCertId());
      setForensicPhotosUrl(initialData.forensic_photos_url || "");
      setGraderNotes(initialData.grader_notes || "");
    } else {
      setCollectorName("");
      setPhoneNumber("");
      setAddress("");
      setCardName("");
      setCardSet("");
      setCardYear("2024");
      setTcgCategory("Pokémon");
      setServiceTier(SERVICE_TIERS[0]);
      setTotalPrice(350000);
      setDpAmount(350000);
      setPaymentStatus("LUNAS");
      setWorkflowStatus("Dalam Daftar");
      setCourier("JNE YES");
      setTrackingNumber("");
      setAssignedGrader(GRADERS[0]);
      setCentering(10);
      setCorners(9.5);
      setEdges(10);
      setSurface(9.5);
      setCertId(generateCertId());
      setForensicPhotosUrl("");
      setGraderNotes("");
    }
  }, [initialData, isOpen]);

  // Live calculation of Final Grade & Label
  const calculated = calculateFinalGrade(
    Number(centering),
    Number(corners),
    Number(edges),
    Number(surface)
  );

  const handleGenerateNewCert = () => {
    setCertId(generateCertId());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const remaining = Math.max(0, Number(totalPrice) - Number(dpAmount));

    const payload: Partial<Submission> = {
      collector_name: collectorName,
      phone_number: phoneNumber,
      address,
      card_name: cardName,
      card_set: cardSet,
      card_year: cardYear,
      tcg_category: tcgCategory,
      service_tier: serviceTier,
      total_price: Number(totalPrice),
      dp_amount: Number(dpAmount),
      remaining_payment: remaining,
      payment_status: paymentStatus,
      workflow_status: workflowStatus,
      courier,
      tracking_number: trackingNumber,
      assigned_grader: assignedGrader,
      cert_id: certId || generateCertId(),
      sub_grades: {
        centering: Number(centering),
        corners: Number(corners),
        edges: Number(edges),
        surface: Number(surface),
      },
      final_grade: calculated.finalGrade,
      grade_label: calculated.label,
      forensic_photos_url: forensicPhotosUrl,
      grader_notes: graderNotes,
    };

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {initialData ? "Edit & Input Grading Kartu" : "Submisi Baru Card Grading ICS"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
          {/* SECTION 1: DATA KOLEKTOR */}
          <div>
            <h4 className="font-bold  tracking-wider text-brand-600 dark:text-brand-400 mb-3 flex items-center gap-1.5">
              1. Identitas Kolektor &amp; Pengiriman
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Kolektor *
                </label>
                <input
                  type="text"
                  required
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  placeholder="e.g. Bagas Pratama"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  No. Telepon / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Alamat Pengembalian Slabs
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Kota / Alamat Lengkap"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: DETAIL KARTU TCG */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <h4 className="font-bold  tracking-wider text-brand-600 dark:text-brand-400 mb-3 flex items-center gap-1.5">
              2. Data Kartu &amp; Layanan Grading
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap Kartu / Karakter *
                </label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="e.g. Charizard Base Set 1st Edition Shadowless"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Kategori Franchise TCG *
                </label>
                <select
                  value={tcgCategory}
                  onChange={(e) => setTcgCategory(e.target.value as TCGCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                >
                  {TCG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Set / Seri Rilis *
                </label>
                <input
                  type="text"
                  required
                  value={cardSet}
                  onChange={(e) => setCardSet(e.target.value)}
                  placeholder="e.g. Base Set / OP-05"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tahun Rilis
                </label>
                <input
                  type="text"
                  value={cardYear}
                  onChange={(e) => setCardYear(e.target.value)}
                  placeholder="1999"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Paket Grading
                </label>
                <select
                  value={serviceTier}
                  onChange={(e) => setServiceTier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                >
                  {SERVICE_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: 4 SUB-GRADES & AUTO-CALCULATED GRADE */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-black  tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  3. Penilaian 4 Sub-Grades &amp; Kalkulasi Otomatis
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Formula Beckett/CGC: Final grade dihitung otomatis dari nilai terendah + 0.5 max.
                </p>
              </div>

              {/* Dynamic Final Grade Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-600 text-white font-black shadow-md">
                <span className="text-xl">{calculated.finalGrade}</span>
                <span className="text-[10px]  font-bold tracking-wider">
                  {calculated.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Centering (1 - 10)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={centering}
                  onChange={(e) => setCentering(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-center font-black text-base text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Corners (1 - 10)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={corners}
                  onChange={(e) => setCorners(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-center font-black text-base text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Edges (1 - 10)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={edges}
                  onChange={(e) => setEdges(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-center font-black text-base text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Surface (1 - 10)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={surface}
                  onChange={(e) => setSurface(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-center font-black text-base text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Cert ID & Auto Generate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-purple-200/50 dark:border-purple-900/30">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Cert ID (ICS-TR-XXXXXX) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={certId}
                    onChange={(e) => setCertId(e.target.value)}
                    placeholder="ICS-TR-XXXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800 font-mono font-bold text-purple-700 dark:text-purple-300"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateNewCert}
                    title="Auto Generate Cert ID"
                    className="px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 shrink-0 font-semibold inline-flex items-center gap-1"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Auto
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  URL Foto Forensik Mikroskop (Google Drive)
                </label>
                <input
                  type="url"
                  value={forensicPhotosUrl}
                  onChange={(e) => setForensicPhotosUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Catatan Forensik Senior Grader
                </label>
                <textarea
                  rows={2}
                  value={graderNotes}
                  onChange={(e) => setGraderNotes(e.target.value)}
                  placeholder="Kondisi foil, centering rasio 50/50, micro whitening, dll."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: WORKFLOW, KURIR, & PEMBAYARAN */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <h4 className="font-bold  tracking-wider text-brand-600 dark:text-brand-400 mb-3">
              4. Workflow Status &amp; Pembayaran
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Workflow Status *
                </label>
                  <select
                    value={workflowStatus}
                    onChange={(e) => setWorkflowStatus(e.target.value as WorkflowStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
                  >
                    {Object.keys(WORKFLOW_STATUS_CONFIG).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Senior Grader
                </label>
                <select
                  value={assignedGrader}
                  onChange={(e) => setAssignedGrader(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                >
                  {GRADERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Status Pembayaran
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold"
                >
                  <option value="LUNAS">LUNAS</option>
                  <option value="DP">DP (Sebagian)</option>
                  <option value="UNPAID">UNPAID (Belum Bayar)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Total Biaya (Rp)
                </label>
                <input
                  type="number"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  DP / Nominal Terbayar (Rp)
                </label>
                <input
                  type="number"
                  value={dpAmount}
                  onChange={(e) => setDpAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Kurir &amp; No. Resi
                </label>
                <div className="flex gap-2">
                  <select
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    className="w-1/2 px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {COURIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="No. Resi"
                    className="w-1/2 px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 font-bold text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Simpan Submisi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

