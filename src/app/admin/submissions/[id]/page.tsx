"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Submission, WORKFLOW_STATUS_CONFIG } from "@/types/submission";
import SubmissionInvoiceModal from "@/components/submissions/SubmissionInvoiceModal";
import SubmissionCertReportModal from "@/components/submissions/SubmissionCertReportModal";
import { ArrowLeft, Edit2, FileText, Award, ShieldCheck } from "lucide-react";

export default function SubmissionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const subId = params?.id as string;

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);

    // Modals Cetak
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
    const [isCertReportOpen, setIsCertReportOpen] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!subId) return;

            try {
                const { data, error } = await supabase
                    .from("submissions")
                    .select("*")
                    .eq("id", subId)
                    .maybeSingle();

                if (!error && data) {
                    setSubmission(data as Submission);
                } else {
                    setSubmission(null);
                }
            } catch (e) {
                console.error("Gagal mengambil detail submisi:", e);
                setSubmission(null);
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [subId]);

    if (loading) {
        return <div className="p-8 text-center text-xs text-gray-400">Memuat detail submisi...</div>;
    }

    if (!submission) {
        return (
            <div className="max-w-6xl mx-auto p-8 text-center space-y-4">
                <div className="text-xs text-rose-500 font-bold">Data submisi tidak ditemukan.</div>
                <Link
                    href="/admin/submissions"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Daftar Submisi
                </Link>
            </div>
        );
    }

    const statusConf =
        WORKFLOW_STATUS_CONFIG[submission.workflow_status] || WORKFLOW_STATUS_CONFIG["Dalam Daftar"];

    // Null Safety untuk sub_grades agar tidak crash jika bernilai null
    const subGrades = submission.sub_grades || { centering: 0, corners: 0, edges: 0, surface: 0 };
    const { centering, corners, edges, surface } = subGrades;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Top Header */}
            <div className="flex items-center justify-between">
                <Link
                    href="/admin/submissions"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Daftar Submisi
                </Link>
                <Link
                    href={`/admin/submissions/${submission.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit &amp; Input Sub-Grades
                </Link>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-6 text-xs">
                {/* Banner Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-brand-600" />
                        <div>
                            <h1 className="text-xl font-black text-gray-900 dark:text-white">
                                Order #{submission.order_no}
                            </h1>
                            <p className="text-xs text-gray-500">
                                Cert ID:{" "}
                                <strong className="font-mono text-brand-600">
                                    {submission.cert_id || "-"}
                                </strong>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsInvoiceOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 cursor-pointer"
                        >
                            <FileText className="w-4 h-4 text-brand-600" />
                            Cetak Invoice
                        </button>
                        <button
                            onClick={() => setIsCertReportOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs cursor-pointer"
                        >
                            <Award className="w-4 h-4" />
                            Cetak Sertifikat Trifold
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                    <span className="font-semibold text-gray-500">Status Workflow Saat Ini:</span>
                    <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                    >
                        {submission.workflow_status}
                    </span>
                </div>

                {/* Card Info & Final Grade */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Detail Kartu
                        </span>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                            {submission.card_name}
                        </h2>
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600 dark:text-gray-400">
                            <div>
                                Franchise: <strong className="text-brand-600">{submission.tcg_category || "-"}</strong>
                            </div>
                            <div>
                                Set: <strong>{submission.card_set || "-"}</strong>
                            </div>
                            <div>
                                Tahun: <strong>{submission.card_year || "Modern"}</strong>
                            </div>
                            <div>
                                Layanan: <strong>{submission.service_tier || "-"}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 text-center flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                            Hasil Grade Final
                        </span>
                        <div className="text-4xl font-black text-purple-700 dark:text-purple-300 mt-1">
                            {submission.final_grade || "0"}
                        </div>
                        <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">
                            {submission.grade_label || "Pending Assessment"}
                        </div>
                    </div>
                </div>

                {/* 4 Sub-Grades */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">Hasil 4 Sub-Grades Forensik</h3>
                    <div className="grid grid-cols-4 gap-3 text-center">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                            <span className="text-[10px] text-gray-500 block">Centering</span>
                            <span className="text-xl font-black text-gray-900 dark:text-white block mt-0.5">
                                {centering || 0}
                            </span>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                            <span className="text-[10px] text-gray-500 block">Corners</span>
                            <span className="text-xl font-black text-gray-900 dark:text-white block mt-0.5">
                                {corners || 0}
                            </span>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                            <span className="text-[10px] text-gray-500 block">Edges</span>
                            <span className="text-xl font-black text-gray-900 dark:text-white block mt-0.5">
                                {edges || 0}
                            </span>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                            <span className="text-[10px] text-gray-500 block">Surface</span>
                            <span className="text-xl font-black text-gray-900 dark:text-white block mt-0.5">
                                {surface || 0}
                            </span>
                        </div>
                    </div>

                    {submission.grader_notes && (
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300">
                            <strong className="text-gray-800 dark:text-white block mb-0.5">
                                Catatan Senior Grader:
                            </strong>
                            <p className="italic">{submission.grader_notes}</p>
                        </div>
                    )}
                </div>

                {/* Info Kolektor & Logistik */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1">
                        <span className="font-bold text-gray-700 dark:text-gray-300 block mb-2">
                            Data Kolektor &amp; Tujuan
                        </span>
                        <p className="font-semibold text-gray-900 dark:text-white">
                            {submission.collector_name}
                        </p>
                        <p className="text-gray-500">Telp: {submission.phone_number || "-"}</p>
                        <p className="text-gray-500">{submission.address || "Direct Lab Drop-off"}</p>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1">
                        <span className="font-bold text-gray-700 dark:text-gray-300 block mb-2">
                            Penugasan &amp; Pembayaran
                        </span>
                        <p>
                            Assigned Grader: <strong>{submission.assigned_grader || "Belum Ditugaskan"}</strong>
                        </p>
                        <p>
                            Kurir: <strong>{submission.courier || "-"}</strong> (Resi:{" "}
                            {submission.tracking_number || "-"})
                        </p>
                        <p>
                            Total Biaya:{" "}
                            <strong>
                                Rp {Number(submission.total_price || 0).toLocaleString("id-ID")}
                            </strong>{" "}
                            ({submission.payment_status || "UNPAID"})
                        </p>
                    </div>
                </div>
            </div>

            <SubmissionInvoiceModal
                submission={submission}
                isOpen={isInvoiceOpen}
                onClose={() => setIsInvoiceOpen(false)}
            />
            <SubmissionCertReportModal
                submission={submission}
                isOpen={isCertReportOpen}
                onClose={() => setIsCertReportOpen(false)}
            />
        </div>
    );
}