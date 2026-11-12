"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { History, ShieldCheck } from "lucide-react";

export interface AuditLogItem {
  id: string;
  grader: string;
  action: string;
  cert_id: string;
  card_name: string;
  timestamp: string;
  badge?: string;
}

export default function GraderAuditLog() {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      try {
        // Ambil data log aktivitas dari Supabase (misal dari tabel audit_logs)
        const { data, error } = await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (!error && data && data.length > 0) {
          setAuditLogs(data as AuditLogItem[]);
        } else {
          setAuditLogs([]);
        }
      } catch (e) {
        console.warn("Gagal mengambil audit log:", e);
        setAuditLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-brand-500" />
            Audit Log Aktivitas Grader
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Riwayat otentikasi, enkapsulasi &amp; registrasi cert real-time
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-4 text-center text-xs text-gray-400">
            Memuat riwayat log...
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            Belum ada log aktivitas grader yang tercatat.
          </div>
        ) : (
          auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {log.grader}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${log.badge || "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                      }`}
                  >
                    {log.action}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {log.card_name}
                </p>
                <div className="text-[10px] font-mono text-brand-600 dark:text-brand-400 font-semibold">
                  Cert: {log.cert_id || "-"}
                </div>
              </div>
              <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                {log.timestamp}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}