"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { ServiceCategory } from "@/types/product";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export interface DashboardCardRegistryRow {
  submission_id: string;
  tcg_type: string;
}

interface Props {
  categories: ServiceCategory[];
  submissions: { id: string; category_name?: string; total_cards?: number }[];
  cards: DashboardCardRegistryRow[];
}

export default function TCGCategoryChart({ categories, submissions, cards }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const chartInfo = useMemo(() => {
    const countsMap: Record<string, number> = {};

    if (selectedCategory === "ALL") {
      // Mode "Semua Kategori": tampilkan distribusi berdasarkan Kategori Produk (category_name)
      submissions.forEach((sub) => {
        const catName = sub.category_name || "Lainnya";
        const qty = Number(sub.total_cards) || 1;
        countsMap[catName] = (countsMap[catName] || 0) + qty;
      });
    } else {
      // Mode Kategori Terpilih: tampilkan distribusi Sub-Kategori (tcg_type) dari item di kategori tersebut
      const validSubIds = new Set(
        submissions
          .filter((sub) => sub.category_name === selectedCategory)
          .map((sub) => sub.id)
      );

      // Inisialisasi sub_types terdaftar milik kategori tersebut agar tetap muncul jika perlu
      const activeCatObj = categories.find((c) => c.name === selectedCategory);
      if (activeCatObj?.sub_types) {
        activeCatObj.sub_types.forEach((st) => {
          countsMap[st.replace(/_/g, " ")] = 0;
        });
      }

      cards.forEach((card) => {
        if (!validSubIds.has(card.submission_id)) return;
        const label = (card.tcg_type || "OTHER").replace(/_/g, " ");
        countsMap[label] = (countsMap[label] || 0) + 1;
      });
    }

    const entries = Object.entries(countsMap)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1]);

    const labels = entries.map(([key]) => key);
    const series = entries.map(([, val]) => val);
    const total = series.reduce((a, b) => a + b, 0);
    const topEntry = entries[0];
    const secondEntry = entries[1];

    return { labels, series, total, topEntry, secondEntry };
  }, [selectedCategory, categories, submissions, cards]);

  const options: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
    },
    labels: chartInfo.labels.length > 0 ? chartInfo.labels : ["Belum Ada Data"],
    colors: ["#6366F1", "#F59E0B", "#EF4444", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#64748B"],
    legend: {
      position: "bottom",
      fontSize: "12px",
      labels: { colors: "#64748B" },
    },
    stroke: { width: 2, colors: ["#fff"] },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: selectedCategory === "ALL" ? "Total Item" : selectedCategory,
              fontSize: "11px",
              color: "#64748B",
              formatter: () => `${chartInfo.total} Item`,
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
  };

  const topPct =
    chartInfo.topEntry && chartInfo.total > 0
      ? Math.round((chartInfo.topEntry[1] / chartInfo.total) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Kategori Terbanyak
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {selectedCategory === "ALL"
              ? "Distribusi item berdasarkan kategori produk"
              : `Sub-kategori pada ${selectedCategory}`}
          </p>
        </div>

        {/* Dropdown Pilih Kategori Produk */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200 cursor-pointer focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="py-2">
        {chartInfo.total === 0 ? (
          <div className="h-[270px] flex items-center justify-center text-xs text-gray-400">
            Belum ada data item untuk kategori ini.
          </div>
        ) : (
          <Chart options={options} series={chartInfo.series} type="donut" height={270} />
        )}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 text-xs flex justify-between gap-2 text-gray-500">
        <span className="truncate">
          Terbanyak:{" "}
          <strong className="text-brand-600 dark:text-brand-400">
            {chartInfo.topEntry ? `${chartInfo.topEntry[0]} (${topPct}%)` : "-"}
          </strong>
        </span>
        <span className="truncate">
          Peringkat 2:{" "}
          <strong className="text-amber-500">
            {chartInfo.secondEntry ? `${chartInfo.secondEntry[0]} (${chartInfo.secondEntry[1]})` : "-"}
          </strong>
        </span>
      </div>
    </div>
  );
}