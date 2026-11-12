"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  FileCheck2,
  Wallet,
  Boxes,
  Layers,
  Users2,
  PlayingCardsFan,
} from "lucide-react";

export type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  allowedRoles?: string[]; // e.g. ['OWNER', 'ADMIN']
};

export const navItems: NavItem[] = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: "/admin/dashboard",
  },
  {
    name: "Submission",
    icon: <FileCheck2 className="w-5 h-5" />,
    path: "/admin/submissions",
  },
  {
    name: "Finance",
    icon: <Wallet className="w-5 h-5" />,
    path: "/admin/finance",
    allowedRoles: ["OWNER", "ADMIN", "Owner", "Bendahara"],
  },
  {
    name: "Inventory",
    icon: <Boxes className="w-5 h-5" />,
    path: "/admin/inventory",
  },
  {
    name: "Katalog & Layanan",
    icon: <Layers className="w-5 h-5" />,
    path: "/admin/products",
    allowedRoles: ["OWNER", "ADMIN", "Owner"],
  },
  {
    name: "Pegawai & Graders",
    icon: <Users2 className="w-5 h-5" />,
    path: "/admin/staff",
    allowedRoles: ["OWNER", "ADMIN", "Owner"],
  },
  {
    name: "Collectors",
    icon: <PlayingCardsFan className="w-5 h-5" />,
    path: "/admin/collectors",
    allowedRoles: ["OWNER", "ADMIN", "Owner"],
  },
];

const Sidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // 1. Fetch Role User dari Supabase
  useEffect(() => {
    const fetchUserRole = async () => {
      setLoadingRole(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (profile?.role) {
            setUserRole(String(profile.role).trim().toUpperCase());
          }
        }
      } catch (error) {
        console.error("Gagal mengambil role profil:", error);
      } finally {
        setLoadingRole(false);
      }
    };

    fetchUserRole();
  }, []);

  // 2. Strict Filter NavItems Berdasarkan Role Permission
  const filteredNavItems = navItems.filter((item) => {
    if (!item.allowedRoles) return true;
    if (loadingRole) return false; // Sembunyikan menu sensitif saat loading role

    const current = (userRole || "").toUpperCase();
    const allowed = item.allowedRoles.map((r) => r.toUpperCase());
    return allowed.includes(current);
  });

  const isActive = useCallback(
    (itemPath: string) => {
      if (itemPath === "/admin/dashboard") {
        return pathname === "/admin/dashboard" || pathname === "/" || pathname === "/admin";
      }
      return pathname.startsWith(itemPath);
    },
    [pathname]
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand Header */}
      <div
        className={`py-6 flex items-center border-b border-gray-100 dark:border-gray-800 mb-4 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start gap-3"
          }`}
      >
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          {/* Logo Wrapper */}
          <div className="relative flex items-center justify-center w-10 h-10 shrink-0 overflow-hidden">
            {/* Logo Tema Terang (Punya class dark:hidden) */}
            <img
              src="/images/logo/ics-logo2.png"
              alt="ICS Logo Light"
              className="w-full h-full object-contain dark:hidden"
            />
            {/* Logo Tema Gelap (Punya class hidden dark:block) */}
            <img
              src="/images/logo/ics-logo3.png"
              alt="ICS Logo Dark"
              className="w-full h-full object-contain hidden dark:block"
            />
          </div>

          {(isExpanded || isHovered || isMobileOpen) && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-wide text-gray-900 dark:text-white  leading-tight">
                ICS Grading
              </span>
              <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 tracking-wider ">
                Indonesia Collectible Standar
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Role Badge Pill */}
      {(isExpanded || isHovered || isMobileOpen) && userRole && (
        <div className="mb-4 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Logged Role:</span>
          <span className="font-bold text-brand-600 dark:text-brand-400  tracking-wide">
            {userRole}
          </span>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar flex-1">
        <nav className="mb-6">
          <h2
            className={`mb-3 text-[11px] font-semibold  tracking-wider text-gray-400 dark:text-gray-500 ${!isExpanded && !isHovered ? "lg:text-center" : "text-left px-1"
              }`}
          >
            {isExpanded || isHovered || isMobileOpen ? "Main Menu" : "• • •"}
          </h2>

          <ul className="flex flex-col gap-1.5">
            {filteredNavItems.map((nav) => {
              const active = isActive(nav.path);
              return (
                <li key={nav.name}>
                  <Link
                    href={nav.path}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${active
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 shadow-xs font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800/60"
                      } ${!isExpanded && !isHovered
                        ? "lg:justify-center"
                        : "lg:justify-start"
                      }`}
                  >
                    <span
                      className={`transition-colors duration-200 ${active
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-gray-500 group-hover:text-gray-800 dark:text-gray-400 dark:group-hover:text-gray-200"
                        }`}
                    >
                      {nav.icon}
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span className="truncate">{nav.name}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Lab Certification Footer Status */}
      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="p-3 mb-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              Lab Status: Online
            </span>
          </div>
          <p className="text-[10px] text-gray-400 leading-tight">
            Acoustic Welding &amp; NFC Ready
          </p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

