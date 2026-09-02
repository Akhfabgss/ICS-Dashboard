"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/types/users";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
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

      const userRole = (profile?.role as UserRole) || "Staff";

      if (allowedRoles.includes(userRole)) {
        setAuthorized(true);
      } else {
        router.push("/"); // Redirect ke dashboard jika tidak berhak
      }
      setLoading(false);
    };

    checkUserRole();
  }, [allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-400">
        Memeriksa hak akses...
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
}