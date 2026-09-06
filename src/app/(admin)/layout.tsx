"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { useRoleProtection } from "../hooks/useRoleProtection";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // 1. Panggil hook proteksi role
  const { authorized, loading } = useRoleProtection();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  // 2. Tampilkan indikator loading saat mengecek role user
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Memeriksa hak akses...
          </p>
        </div>
      </div>
    );
  }

  // 3. Jika tidak memiliki otorisasi, jangan tampilkan apapun (otomatis di-redirect oleh hook)
  if (!authorized) {
    return null;
  }

  return (
    // Tambahkan overflow-x-hidden di container paling luar
    <div className="min-h-screen xl:flex overflow-x-hidden w-full">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />

      {/* Main Content Area */}
      {/* KUNCI UTAMANYA ADA DI SINI: Tambahkan min-w-0 dan overflow-x-hidden */}
      <div
        className={`flex-1 min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />

        {/* Page Content */}
        {/* Tambahkan min-w-0 & max-w-full agar container page mengunci tabel */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 min-w-0 max-w-full">
          {children}
        </div>
      </div>
    </div>
  );
}