"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export interface DashboardSubmissionItem {
  id: string;
  order_no: string;
  collector_name: string;
  category_name?: string;
  total_cards: number;
  total_price: number;
  payment_status: string;
  status: string;
  created_at: string;
  card_name?: string;
  card_set?: string;
  tcg_category?: string;
  final_grade?: number;
  cert_id?: string;
}

interface Props {
  submissions: DashboardSubmissionItem[];
}

export default function SubmissionTrendsChart({ submissions }: Props) {
  const [period, setPeriod] = useState<"monthly" | "weekly">("monthly");
  const currentYear = new Date().getFullYear();

  const chartData = useMemo(() => {
    if (period === "monthly") {
      const labels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const incoming = new Array(12).fill(0);
      const completed = new Array(12).fill(0);

      submissions.forEach((sub) => {
        if (!sub.created_at) return;
        const d = new Date(sub.created_at);
        if (isNaN(d.getTime()) || d.getFullYear() !== currentYear) return;

        const monthIdx = d.getMonth();
        const qty = Number(sub.total_cards) || 1;

        if (sub.status !== "REJECTED") {
          incoming[monthIdx] += qty;
        }
        if (sub.status === "COMPLETED") {
          completed[monthIdx] += qty;
        }
      });

      return { labels, incoming, completed };
    } else {
      const labels: string[] = [];
      const dayKeys: string[] = [];
      const incoming = new Array(7).fill(0);
      const completed = new Array(7).fill(0);
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dayKeys.push(key);
        labels.push(`${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`);
      }

      submissions.forEach((sub) => {
        if (!sub.created_at) return;
        const key = sub.created_at.split("T")[0];
        const idx = dayKeys.indexOf(key);
        if (idx === -1) return;

        const qty = Number(sub.total_cards) || 1;
        if (sub.status !== "REJECTED") {
          incoming[idx] += qty;
        }
        if (sub.status === "COMPLETED") {
          completed[idx] += qty;
        }
      });

      return { labels, incoming, completed };
    }
  }, [submissions, period, currentYear]);

  const series = [
    {
      name: "Submisi Masuk (Item)",
      data: chartData.incoming,
    },
    {
      name: "Selesai & Kirim",
      data: chartData.completed,
    },
  ];

  const options: ApexOptions = {
    chart: {
      type: "area",
      height: 310,
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
    },
    colors: ["#6366F1", "#10B981"],
    stroke: {
      curve: "smooth",
      width: 2.5,
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.35,
        opacityTo: 0.05,
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: chartData.labels,
      labels: {
        style: { colors: "#64748B", fontSize: "12px" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#64748B", fontSize: "12px" },
        formatter: (val) => `${Math.round(val)} Item`,
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontSize: "12px",
      labels: { colors: "#64748B" },
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} Item Koleksi`,
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Tren Submisi Grading
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Volume item masuk berdasarkan tanggal order vs item selesai diproses
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${period === "monthly"
                ? "bg-white dark:bg-gray-700 text-brand-600 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
              }`}
          >
            Bulanan ({currentYear})
          </button>
          <button
            onClick={() => setPeriod("weekly")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${period === "weekly"
                ? "bg-white dark:bg-gray-700 text-brand-600 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
              }`}
          >
            7 Hari Terakhir
          </button>
        </div>
      </div>
      <div className="w-full">
        <Chart options={options} series={series} type="area" height={290} />
      </div>
    </div>
  );
}