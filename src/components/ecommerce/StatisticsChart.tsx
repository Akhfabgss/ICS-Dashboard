"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import flatpickr from "flatpickr";
import { supabase } from "@/lib/supabase";
import ChartTab from "../common/ChartTab";
import { CalenderIcon } from "../../icons";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function StatisticsChart() {
  const datePickerRef = useRef<HTMLInputElement>(null);

  // State untuk data agregasi per bulan
  const [monthlyIncome, setMonthlyIncome] = useState<number[]>(new Array(12).fill(0));
  const [monthlyExpense, setMonthlyExpense] = useState<number[]>(new Array(12).fill(0));
  const [loading, setLoading] = useState(true);

  // Fetch & Agregasi Data dari Supabase
  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);

      const [ordersRes, financesRes] = await Promise.all([
        supabase.from("orders").select("dp_amount, repayment_amount, created_at"),
        supabase.from("finances").select("expense, created_at"),
      ]);

      const incomeArr = new Array(12).fill(0);
      const expenseArr = new Array(12).fill(0);

      // Hitung Pemasukan per bulan
      if (ordersRes.data) {
        ordersRes.data.forEach((ord) => {
          const monthIndex = new Date(ord.created_at).getMonth();
          const totalPaid = Number(ord.dp_amount || 0) + Number(ord.repayment_amount || 0);
          incomeArr[monthIndex] += totalPaid;
        });
      }

      // Hitung Pengeluaran per bulan
      if (financesRes.data) {
        financesRes.data.forEach((fin) => {
          const monthIndex = new Date(fin.created_at).getMonth();
          expenseArr[monthIndex] += Number(fin.expense || 0);
        });
      }

      setMonthlyIncome(incomeArr);
      setMonthlyExpense(expenseArr);
      setLoading(false);
    };

    fetchChartData();
  }, []);

  // Init DatePicker
  useEffect(() => {
    if (!datePickerRef.current) return;

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    const fp = flatpickr(datePickerRef.current, {
      mode: "range",
      static: true,
      monthSelectorType: "static",
      dateFormat: "M d",
      defaultDate: [sevenDaysAgo, today],
      clickOpens: true,
      prevArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      nextArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    });

    return () => {
      if (!Array.isArray(fp)) {
        fp.destroy();
      }
    };
  }, []);

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontSize: "12px",
      fontFamily: "Outfit, sans-serif",
      labels: {
        colors: "#6B7280",
      },
    },
    colors: ["#10B981", "#F43F5E"], // Emerald untuk Income, Rose untuk Expense
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "area",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "smooth",
      width: [2.5, 2.5],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.35,
        opacityTo: 0.05,
      },
    },
    markers: {
      size: 4,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: {
        lines: { show: false },
      },
      yaxis: {
        lines: { show: true },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val: number) => `Rp ${val.toLocaleString("id-ID")}`,
      },
    },
    xaxis: {
      type: "category",
      categories: MONTH_NAMES,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
        formatter: (val: number) => {
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
          return val.toString();
        },
      },
    },
  };

  const series = useMemo(
    () => [
      {
        name: "Pemasukan (Income)",
        data: monthlyIncome,
      },
      {
        name: "Pengeluaran (Expense)",
        data: monthlyExpense,
      },
    ],
    [monthlyIncome, monthlyExpense]
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Grafik Pemasukan vs Pengeluaran
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Perbandingan mutasi keuangan harian &amp; bulanan toko
          </p>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <ChartTab />
          <div className="relative inline-flex items-center">
            <CalenderIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-3 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
            <input
              ref={datePickerRef}
              className="h-10 w-10 lg:w-40 lg:h-auto lg:pl-10 lg:pr-3 lg:py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-transparent lg:text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:lg:text-gray-300 cursor-pointer"
              placeholder="Pilih rentang tgl"
            />
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          {loading ? (
            <div className="h-[310px] flex items-center justify-center text-xs text-gray-400">
              Memuat grafik keuangan...
            </div>
          ) : (
            <Chart options={options} series={series} type="area" height={310} />
          )}
        </div>
      </div>
    </div>
  );
}