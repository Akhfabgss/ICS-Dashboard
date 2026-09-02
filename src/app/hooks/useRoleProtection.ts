"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Aturan Akses Menu berdasarkan Role
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/resellers": ["Owner"],
  "/products": ["Owner"],
  "/pegawai": ["Owner"],
  "/finance": ["Owner", "Bendahara"],
  "/invoices": ["Owner", "Bendahara"],
  
};

export function useRoleProtection() {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/signin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const userRole = profile?.role ? String(profile.role).trim() : "";

      // Cek apakah route yang diakses memiliki batasan role
      const allowedRoles = ROUTE_PERMISSIONS[pathname];

      if (allowedRoles && !allowedRoles.includes(userRole)) {
        // Jika tidak memiliki akses, lempar ke halaman Dashboard Utama
        router.replace("/");
      } else {
        setAuthorized(true);
      }

      setLoading(false);
    };

    checkPermission();
  }, [pathname, router]);

  return { authorized, loading };
}