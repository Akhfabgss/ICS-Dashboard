"use client";

import React from "react";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import Sidebar from "@/layout/Sidebar";
import Backdrop from "@/layout/Backdrop";
import { useRoleProtection } from "../hooks/useRoleProtection";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { authorized, loading } = useRoleProtection();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Memverifikasi Hak Akses ICS Card Grading...
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen xl:flex overflow-x-hidden w-full bg-gray-50/50 dark:bg-gray-950">
      <Sidebar />
      <Backdrop />

      <div
        className={`flex-1 min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader />

        <main className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 min-w-0 max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

