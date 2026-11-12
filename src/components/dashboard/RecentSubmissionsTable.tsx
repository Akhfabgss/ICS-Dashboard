"use client";

import React from "react";
import Link from "next/link";
import { DashboardSubmissionItem } from "./SubmissionTrendsChart";
import { ArrowUpRight, Eye } from "lucide-react";

interface Props {
  submissions: DashboardSubmissionItem[];
  loading?: boolean;
}

const STATUS_BADGE_MAP: Record<
  string,
  { label: string; className: string }
> = {
  PENDING_RECEIPT: {
    label: "Dalam Daftar",
    className:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  },
  PROCESSING: {
    label: "Pengerjaan",
    className:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800",
  },
  COMPLETED: {
    label: "Selesai & Kirim",
    className:
      "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800",
  },
  REJECTED: {
    label: "Ditolak",
    className:
      "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800",
  },
};

export default function RecentSubmissionsTable({ submissions, loading = false }: Props) {
  const displayList = submissions.slice(0, 6);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Submisi Terbaru (Quick Access)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Daftar order grading koleksi terbaru dari tabel submisi
          </p>
        </div>
        <Link
          href="/admin/submissions"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          Lihat Semua Submisi
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[750px] text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400 tracking-wider font-semibold uppercase">
            <tr>
              <th className="py-2.5 px-3 rounded-l-lg">Order ID &amp; Pemesan</th>
              <th className="py-2.5 px-3">Detail Item &amp; Kategori</th>
              <th className="py-2.5 px-3">Total Biaya</th>
              <th className="py-2.5 px-3">Status Workflow</th>
              <th className="py-2.5 px-3">Grade / Cert</th>
              <th className="py-2.5 px-3 rounded-r-lg text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400">
                  Memuat data submisi...
                </td>
              </tr>
            ) : displayList.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400">
                  Belum ada submisi grading.
                </td>
              </tr>
            ) : (
              displayList.map((item) => {
                const statusConf = STATUS_BADGE_MAP[item.status] || {
                  label: item.status || "Dalam Daftar",
                  className:
                    "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
                };

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Order ID & Pemesan */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {item.order_no}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {item.collector_name}
                      </div>
                    </td>

                    {/* Detail Item & Kategori */}
                    <td className="py-3 px-3 max-w-[220px]">
                      <div
                        className="font-semibold text-gray-800 dark:text-gray-200 truncate"
                        title={item.card_name}
                      >
                        {item.card_name || "Item Koleksi"}{" "}
                        {item.total_cards > 1 ? `(+${item.total_cards - 1} item)` : ""}
                      </div>
                      <div className="text-[11px] text-brand-600 dark:text-brand-400 font-medium truncate">
                        {item.category_name || "Card / TCG"}
                        {item.tcg_category ? ` • ${item.tcg_category.replace(/_/g, " ")}` : ""}
                        {item.card_set ? ` • ${item.card_set}` : ""}
                      </div>
                    </td>

                    {/* Total Biaya & Status Pembayaran */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-gray-900 dark:text-white">
                        Rp {Number(item.total_price || 0).toLocaleString("id-ID")}
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${item.payment_status === "PAID"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : item.payment_status === "DP"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                          }`}
                      >
                        {item.payment_status === "PAID"
                          ? "LUNAS"
                          : item.payment_status === "DP"
                            ? "DP"
                            : "UNPAID"}
                      </span>
                    </td>

                    {/* Status Workflow */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${statusConf.className}`}
                      >
                        {statusConf.label}
                      </span>
                    </td>

                    {/* Grade & Nomor Cert */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {Number(item.final_grade) > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center justify-center w-6 h-6 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-black text-xs shrink-0">
                            {item.final_grade}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                            {item.cert_id}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">
                          {item.cert_id || "Dalam Proses"}
                        </span>
                      )}
                    </td>

                    {/* Kolom Aksi "See Detail" */}
                    <td className="py-3 px-3 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/submissions/${item.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-[11px] font-bold transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        See Detail
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}