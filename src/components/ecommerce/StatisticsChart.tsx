"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { supabase } from "@/lib/supabase";
import { CalenderIcon } from "../../icons";
import { Instance } from "flatpickr/dist/types/instance";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

const QUARTER_NAMES = ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Okt-Des)"];

export default function StatisticsChart() {
  const datePickerRef = useRef<HTMLInputElement>(null);
  const fpInstanceRef = useRef<Instance | null>(null);

  // States
  const [viewMode, setViewMode] = useState<"monthly" | "quarterly" | "annually">("monthly");
  const [dataFilter, setDataFilter] = useState<"all" | "income" | "expense">("all");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const [rawOrders, setRawOrders] = useState<{ dp: number; rep: number; date: Date }[]>([]);
  const [rawFinances, setRawFinances] = useState<{ income: number; expense: number; date: Date }[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Data Sekali dari Supabase (atau saat dateRange berubah)
  const fetchChartData = useCallback(async () => {
    setLoading(true);

    let ordersQuery = supabase.from("orders").select("dp_amount, repayment_amount, created_at");
    let financesQuery = supabase.from("finances").select("income, expense, created_at");

    // Filter berdasarkan rentang tanggal jika ada
    if (dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].toISOString();
      const endDate = new Date(dateRange[1].setHours(23, 59, 59, 999)).toISOString();

      ordersQuery = ordersQuery.gte("created_at", startDate).lte("created_at", endDate);
      financesQuery = financesQuery.gte("created_at", startDate).lte("created_at", endDate);
    }

    const [ordersRes, financesRes] = await Promise.all([ordersQuery, financesQuery]);

    if (ordersRes.data) {
      setRawOrders(
        ordersRes.data.map((o) => ({
          dp: Number(o.dp_amount || 0),
          rep: Number(o.repayment_amount || 0),
          date: new Date(o.created_at),
        }))
      );
    }

    if (financesRes.data) {
      setRawFinances(
        financesRes.data.map((f) => ({
          income: Number(f.income || 0),
          expense: Number(f.expense || 0),
          date: new Date(f.created_at),
        }))
      );
    }

    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Init DatePicker & Handle Event
  useEffect(() => {
    if (!datePickerRef.current) return;

    fpInstanceRef.current = flatpickr(datePickerRef.current, {
      mode: "range",
      static: true,
      monthSelectorType: "static",
      dateFormat: "d M Y",
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          setDateRange([selectedDates[0], selectedDates[1]]);
        }
      },
      prevArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      nextArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    }) as Instance;

    return () => {
      fpInstanceRef.current?.destroy();
    };
  }, []);

  // Hitung Agregasi Data Berdasarkan viewMode (Monthly, Quarterly, Annually)
  const { categories, incomeData, expenseData } = useMemo(() => {
    if (viewMode === "monthly") {
      const inc = new Array(12).fill(0);
      const exp = new Array(12).fill(0);

      rawOrders.forEach((o) => {
        const m = o.date.getMonth(); // 0 - 11
        inc[m] += o.dp + o.rep;
      });

      rawFinances.forEach((f) => {
        const m = f.date.getMonth();
        inc[m] += f.income;
        exp[m] += f.expense;
      });

      return { categories: MONTH_NAMES, incomeData: inc, expenseData: exp };
    }

    if (viewMode === "quarterly") {
      const inc = new Array(4).fill(0);
      const exp = new Array(4).fill(0);

      rawOrders.forEach((o) => {
        const q = Math.floor(o.date.getMonth() / 3); // 0: Q1, 1: Q2, dst.
        inc[q] += o.dp + o.rep;
      });

      rawFinances.forEach((f) => {
        const q = Math.floor(f.date.getMonth() / 3);
        inc[q] += f.income;
        exp[q] += f.expense;
      });

      return { categories: QUARTER_NAMES, incomeData: inc, expenseData: exp };
    }

    // View Mode: Annually (Berdasarkan Tahun)
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
    const categoriesYear = years.map((y) => y.toString());

    const inc = new Array(years.length).fill(0);
    const exp = new Array(years.length).fill(0);

    rawOrders.forEach((o) => {
      const yIdx = years.indexOf(o.date.getFullYear());
      if (yIdx !== -1) inc[yIdx] += o.dp + o.rep;
    });

    rawFinances.forEach((f) => {
      const yIdx = years.indexOf(f.date.getFullYear());
      if (yIdx !== -1) {
        inc[yIdx] += f.income;
        exp[yIdx] += f.expense;
      }
    });

    return { categories: categoriesYear, incomeData: inc, expenseData: exp };
  }, [viewMode, rawOrders, rawFinances]);

  // Series ApexCharts berdasarkan Filter (Semua, Income Saja, Expense Saja)
  const series = useMemo(() => {
    const s = [];

    if (dataFilter === "all" || dataFilter === "income") {
      s.push({
        name: "Pemasukan (Income)",
        data: incomeData,
      });
    }

    if (dataFilter === "all" || dataFilter === "expense") {
      s.push({
        name: "Pengeluaran (Expense)",
        data: expenseData,
      });
    }

    return s;
  }, [dataFilter, incomeData, expenseData]);

  // Dynamic Chart Colors
  const chartColors = useMemo(() => {
    if (dataFilter === "income") return ["#10B981"];
    if (dataFilter === "expense") return ["#F43F5E"];
    return ["#10B981", "#F43F5E"];
  }, [dataFilter]);

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontSize: "12px",
      fontFamily: "Outfit, sans-serif",
      labels: { colors: "#6B7280" },
    },
    colors: chartColors,
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "area",
      toolbar: { show: false },
    },
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
    markers: {
      size: 4,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { size: 6 },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val: number) => `Rp ${val.toLocaleString("id-ID")}`,
      },
    },
    xaxis: {
      type: "category",
      categories: categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: ["#6B7280"] },
        formatter: (val: number) => {
          if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}Miliar`;
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}Jt`;
          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
          return val.toString();
        },
      },
    },
  };

  const handleResetDate = () => {
    setDateRange([null, null]);
    fpInstanceRef.current?.clear();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">

      {/* HEADER & FILTER ACTION */}
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Grafik Pemasukan vs Pengeluaran
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Perbandingan mutasi keuangan harian &amp; bulanan toko
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-3">

          {/* 1. Toggle Filter Pemasukan / Pengeluaran */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setDataFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${dataFilter === "all"
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              Semua
            </button>
            <button
              onClick={() => setDataFilter("income")}
              className={`px-3 py-1.5 rounded-lg transition-all ${dataFilter === "income"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => setDataFilter("expense")}
              className={`px-3 py-1.5 rounded-lg transition-all ${dataFilter === "expense"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              Pengeluaran
            </button>
          </div>

          {/* 2. Mode Tab View (Monthly, Quarterly, Annually) */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === "monthly"
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode("quarterly")}
              className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === "quarterly"
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              Quarterly
            </button>
            <button
              onClick={() => setViewMode("annually")}
              className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === "annually"
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              Annually
            </button>
          </div>

          {/* 3. Date Picker & Reset */}
          <div className="relative inline-flex items-center gap-2">
            <div className="relative">
              <CalenderIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10 w-6 h-6" />
              <input
                ref={datePickerRef}
                className="h-9 w-44 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer focus:border-brand-500"
                placeholder="Pilih rentang tgl..."
              />
            </div>

            {dateRange[0] && (
              <button
                onClick={handleResetDate}
                className="text-xs text-rose-500 hover:underline"
              >
                Reset
              </button>
            )}
          </div>

        </div>
      </div>

      {/* CHART CANVAS */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[700px] xl:min-w-full">
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