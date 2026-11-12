"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useAuthCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      // 1. Cek sesi login Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // 2. Ambil data profil dari tabel public.profiles
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, is_profile_completed, full_name, whatsapp_no")
        .eq("id", userId)
        .single();

      if (error || !profile) {
        // Jika profile belum terbuat sama sekali, arahkan ke onboarding
        if (pathname !== "/onboarding") {
          router.replace("/onboarding");
        }
        setLoading(false);
        return;
      }

      // 3. Pengecekan Alur Routing berdasarkan Role & Status Profil:

      // A. Jika Staff Internal (OWNER, ADMIN, SENIOR_GRADER, OPERATOR)
      if (["OWNER", "ADMIN", "SENIOR_GRADER", "OPERATOR"].includes(profile.role)) {
        if (pathname.startsWith("/signin") || pathname === "/onboarding") {
          router.replace("/admin/dashboard");
        }
      } 
      // B. Jika User Biasa (COLLECTOR)
      else {
        // Jika profil belum lengkap (atau nama/WA masih kosong)
        if (!profile.is_profile_completed || !profile.full_name || !profile.whatsapp_no) {
          if (pathname !== "/onboarding") {
            router.replace("/onboarding");
          }
        } else {
          // Jika sudah lengkap & mengakses signin/onboarding, lempar ke vault/home
          if (pathname.startsWith("/signin") || pathname === "/onboarding") {
            router.replace("/vault"); // atau halaman utama user
          }
        }
      }

      setLoading(false);
    };

    checkUserStatus();
  }, [pathname, router]);

  return { loading };
}