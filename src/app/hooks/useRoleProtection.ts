"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Aturan Akses Menu berdasarkan Role untuk ICS Card Grading & Authentic Registry
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/admin/finance": ["OWNER", "ADMIN", "Owner", "Bendahara"],
  "/finance": ["OWNER", "ADMIN", "Owner", "Bendahara"],
  "/admin/staff": ["OWNER", "ADMIN", "Owner"],
  "/admin/products": ["OWNER", "ADMIN", "Owner"],
};

export function useRoleProtection() {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      setLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/signin");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const userRole = profile?.role ? String(profile.role).trim().toUpperCase() : "";

        // Cek apakah route yang diakses memiliki batasan role
        const allowedRoles = ROUTE_PERMISSIONS[pathname];

        if (allowedRoles) {
          const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
          if (!normalizedAllowed.includes(userRole)) {
            // Jika role tidak diizinkan (misal SENIOR_GRADER buka finance), lempar ke Dashboard Utama
            router.replace("/admin/dashboard");
            return;
          }
        }

        setAuthorized(true);
      } catch (error) {
        console.error("Role protection check failed:", error);
        setAuthorized(true);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [pathname, router]);

  return { authorized, loading };
}
