"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { supabase } from "@/lib/supabase";
import {
  GridIcon,
  BoxIcon,
  ChevronDownIcon,
  HorizontaLDots,
} from "../icons";

import {
  ShoppingCart,
  FileText,
  Wallet,
  User,
  Layers,
  Handshake,
  Clock,
  ListCheckIcon,
} from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <ShoppingCart />,
    name: "Pemesanan",
    path: "/orders",
  },
  {
    icon: <FileText />,
    name: "Invoice",
    path: "/invoices",
  },
  {
    icon: <Wallet />,
    name: "Keuangan (Kas)",
    path: "/finance",
  },
  {
    icon: <Layers />,
    name: "Stock",
    path: "/stock",
  },
  {
    icon: <BoxIcon />,
    name: "Produk",
    path: "/products",
  },
  {
    icon: <Handshake />,
    name: "Reseller",
    path: "/resellers",
  },
  {
    icon: <Clock />,
    name: "Presensi Pegawai",
    path: "/attendances",
  },
  {
    icon: <ListCheckIcon />,
    name: "To do List",
    path: "/todos",
  },
  {
    icon: <User />,
    name: "Pegawai",
    path: "/pegawai",
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  // State untuk menyimpan Role & Status Loading Role
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 1. Fetch Role User dari Supabase
  useEffect(() => {
    const fetchUserRole = async () => {
      setLoadingRole(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (profile) {
            setUserRole(profile.role);
          }
        }
      } catch (error) {
        console.error("Gagal mengambil role:", error);
      } finally {
        setLoadingRole(false);
      }
    };

    fetchUserRole();
  }, []);

  // 2. Filter Menu Berdasarkan Role (Strict Filter)
  const filteredNavItems = navItems.filter((item) => {
    // Jika role masih loading, sembunyikan menu sensitif sementara
    if (loadingRole) {
      if (item.path === "/finance" || item.path === "/pegawai") return false;
    }

    const role = userRole?.trim();

    // Menu Pegawai: HANYA untuk Owner
    if (item.path === "/pegawai") {
      return role === "Owner";
    }

    // Menu Produk: HANYA untuk Owner
    if (item.path === "/products") {
      return role === "Owner";
    }

    // Menu Reseller: HANYA untuk Owner
    if (item.path === "/resellers") {
      return role === "Owner";
    }

    // Menu Presensi: HANYA untuk Owner
    if (item.path === "/attendances") {
      return role === "Owner";
    }

    // Menu Keuangan (Kas): HANYA untuk Owner atau Bendahara (Staff di-hide)
    if (item.path === "/finance") {
      return role === "Owner" || role === "Bendahara";
    }

    // Menu Keuangan (Kas): HANYA untuk Owner atau Bendahara (Staff di-hide)
    if (item.path === "/invoices") {
      return role === "Owner" || role === "Bendahara";
    }

    return true;
  });

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    let submenuMatched = false;
    filteredNavItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({
              type: "main",
              index,
            });
            submenuMatched = true;
          }
        });
      }
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, filteredNavItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === "main" &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: "main", index };
    });
  };

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index)}
              className={`menu-item group ${openSubmenu?.type === "main" && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`${openSubmenu?.type === "main" && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === "main" && openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`main-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === "main" && openSubmenu?.index === index
                    ? `${subMenuHeight[`main-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
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
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/framelo-logo2.png"
                alt="Logo"
                width={80}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/framelo-logo3.png"
                alt="Logo"
                width={80}
                height={40}
              />
            </>
          ) : (
            <Image
              className="dark:bg-white dark:p-1 dark:rounded"
              src="/images/logo/framelo-logo2.png"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(filteredNavItems)}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;