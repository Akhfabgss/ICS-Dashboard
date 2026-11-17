"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Shield,
    Save,
    Lock,
    CheckCircle2,
    AlertCircle,
    AtSign,
    Calendar,
} from "lucide-react";

interface ProfileData {
    id: string;
    username: string;
    full_name: string;
    whatsapp_no: string;
    role: "OWNER" | "ADMIN" | "SENIOR_GRADER" | "OPERATOR" | "COLLECTOR";
    created_at: string;
    is_profile_completed: boolean;
    address: string;
}

const ROLE_BADGE_STYLE: Record<string, { label: string; className: string }> = {
    OWNER: {
        label: "Owner",
        className:
            "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    },
    ADMIN: {
        label: "Administrator",
        className:
            "bg-brand-100 text-brand-800 border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800",
    },
    SENIOR_GRADER: {
        label: "Senior Grader",
        className:
            "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
    },
    OPERATOR: {
        label: "Lab Operator",
        className:
            "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
    },
    COLLECTOR: {
        label: "Collector",
        className:
            "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    },
};

export default function EditProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Auth info
    const [userId, setUserId] = useState<string>("");
    const [email, setEmail] = useState<string>("");

    // Form fields sesuai tabel public.profiles
    const [username, setUsername] = useState<string>("");
    const [fullName, setFullName] = useState<string>("");
    const [whatsappNo, setWhatsappNo] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const [role, setRole] = useState<ProfileData["role"]>("COLLECTOR");
    const [createdAt, setCreatedAt] = useState<string>("");
    const [isProfileCompleted, setIsProfileCompleted] = useState<boolean>(false);

    // Optional Change Password
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            try {
                const {
                    data: { user },
                    error: authErr,
                } = await supabase.auth.getUser();

                if (authErr || !user) {
                    router.push("/signin");
                    return;
                }

                setUserId(user.id);
                setEmail(user.email || "");

                const { data: profile, error: profErr } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .maybeSingle();

                if (profErr) throw profErr;

                if (profile) {
                    setUsername(profile.username || "");
                    setFullName(profile.full_name || "");
                    setWhatsappNo(profile.whatsapp_no || "");
                    setAddress(profile.address || "");
                    setRole(profile.role || "COLLECTOR");
                    setCreatedAt(profile.created_at || user.created_at || "");
                    setIsProfileCompleted(Boolean(profile.is_profile_completed));
                } else {
                    // Fallback jika baris profiles belum terbentuk
                    setFullName(user.user_metadata?.full_name || "");
                    setUsername(user.email?.split("@")[0] || "");
                    setCreatedAt(user.created_at || "");
                }
            } catch (err: any) {
                console.error("Gagal memuat profil:", err);
                Swal.fire("Gagal Memuat Profil", err.message || "Terjadi kesalahan saat mengambil data.", "error");
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [router]);

    const handleUsernameChange = (val: string) => {
        // Normalisasi username: huruf kecil, angka, underscore, tanpa spasi
        const sanitized = val.toLowerCase().replace(/[^a-z0-9._]/g, "");
        setUsername(sanitized);
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        if (!fullName.trim() || !username.trim()) {
            Swal.fire("Data Belum Lengkap", "Nama Lengkap dan Username wajib diisi.", "warning");
            return;
        }

        setSaving(true);
        try {
            // Cek apakah username sudah dipakai user lain (constraint profiles_username_key)
            const { data: existingUser } = await supabase
                .from("profiles")
                .select("id")
                .eq("username", username.trim())
                .neq("id", userId)
                .maybeSingle();

            if (existingUser) {
                Swal.fire(
                    "Username Sudah Digunakan",
                    `Username "@${username.trim()}" sudah dipakai akun lain. Silakan pilih username lain.`,
                    "warning"
                );
                setSaving(false);
                return;
            }

            const completedFlag = Boolean(
                fullName.trim() && username.trim() && whatsappNo.trim()
            );

            const { error } = await supabase
                .from("profiles")
                .upsert(
                    {
                        id: userId,
                        username: username.trim(),
                        full_name: fullName.trim(),
                        whatsapp_no: whatsappNo.trim() || null,
                        address: address.trim() || null,
                        is_profile_completed: completedFlag,
                    },
                    { onConflict: "id" }
                );

            if (error) throw error;

            // Sinkronkan juga display name di metadata auth user
            await supabase.auth.updateUser({
                data: {
                    full_name: fullName.trim(),
                    username: username.trim(),
                },
            });

            setIsProfileCompleted(completedFlag);

            Swal.fire(
                "Profil Diperbarui!",
                "Perubahan informasi profil Anda telah berhasil disimpan.",
                "success"
            );
            router.refresh();
        } catch (err: any) {
            Swal.fire("Gagal Menyimpan!", err.message || "Terjadi kesalahan saat menyimpan profil.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            Swal.fire("Password Terlalu Pendek", "Password baru minimal 6 karakter.", "warning");
            return;
        }
        if (newPassword !== confirmPassword) {
            Swal.fire("Password Tidak Cocok", "Konfirmasi password tidak sama dengan password baru.", "warning");
            return;
        }

        setSavingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            setNewPassword("");
            setConfirmPassword("");
            Swal.fire("Password Diperbarui!", "Password akun Anda berhasil diubah.", "success");
        } catch (err: any) {
            Swal.fire("Gagal Ubah Password!", err.message || "Terjadi kesalahan.", "error");
        } finally {
            setSavingPassword(false);
        }
    };

    const initials = (fullName || username || email || "U")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const roleBadge = ROLE_BADGE_STYLE[role] || ROLE_BADGE_STYLE.COLLECTOR;

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-4">
                <div className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-80 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 text-xs">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-brand-600" />
                    Pengaturan &amp; Edit Profil
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                    Kelola identitas akun, nomor WhatsApp, alamat pengiriman, dan keamanan password Anda.
                </p>
            </div>

            {/* Ringkasan Kartu Identitas User */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white flex items-center justify-center text-lg font-black shadow-md shrink-0">
                        {initials}
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-black text-gray-900 dark:text-white">
                                {fullName || "Nama Belum Diatur"}
                            </h2>
                            <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleBadge.className}`}
                            >
                                {roleBadge.label}
                            </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
                            <span>@{username || "username"}</span>
                            <span>•</span>
                            <span>{email}</span>
                        </p>
                        {createdAt && (
                            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Terdaftar sejak{" "}
                                {new Date(createdAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                        )}
                    </div>
                </div>

                {/* Status Kelengkapan Profil */}
                <div className="self-start sm:self-center">
                    {isProfileCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            Profil Lengkap
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold">
                            <AlertCircle className="w-4 h-4" />
                            Lengkapi WhatsApp &amp; Alamat
                        </span>
                    )}
                </div>
            </div>

            {/* Form Edit Informasi Profil (public.profiles) */}
            <form
                onSubmit={handleSaveProfile}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-5"
            >
                <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Informasi Pribadi &amp; Kontak
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Data ini digunakan untuk identifikasi staff/kolektor dan informasi pengiriman paket.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            Nama Lengkap (full_name) *
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Nama lengkap Anda..."
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            Username *
                        </label>
                        <div className="relative">
                            <AtSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => handleUsernameChange(e.target.value)}
                                placeholder="username_unik"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-semibold focus:outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>

                    {/* Email (Read-only dari Auth) */}
                    <div>
                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            Email Akun (Login)
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="email"
                                readOnly
                                value={email}
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* WhatsApp No */}
                    <div>
                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            Nomor WhatsApp (whatsapp_no)
                        </label>
                        <div className="relative">
                            <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="tel"
                                value={whatsappNo}
                                onChange={(e) => setWhatsappNo(e.target.value)}
                                placeholder="0812xxxxxxxx"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Role (Read-Only agar user tidak bisa mengubah role-nya sendiri) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            Hak Akses / Role
                        </label>
                        <div className="relative">
                            <Shield className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                readOnly
                                value={role}
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 font-bold cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        Alamat Lengkap (address)
                    </label>
                    <div className="relative">
                        <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                        <textarea
                            rows={3}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Alamat lengkap jalan, kecamatan, kota, dan kode pos..."
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-brand-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Menyimpan..." : "Simpan Perubahan Profil"}
                    </button>
                </div>
            </form>

            {/* Form Ubah Password */}
            <form
                onSubmit={handleUpdatePassword}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4"
            >
                <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Lock className="w-4 h-4 text-brand-600" />
                        Keamanan Akun &amp; Ganti Password
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Kosongkan bagian ini jika tidak ingin mengganti password saat ini.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            Password Baru
                        </label>
                        <input
                            type="password"
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            Konfirmasi Password Baru
                        </label>
                        <input
                            type="password"
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi password baru"
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                        type="submit"
                        disabled={savingPassword || !newPassword}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white font-bold transition-all cursor-pointer disabled:opacity-40"
                    >
                        <Lock className="w-3.5 h-3.5" />
                        {savingPassword ? "Memperbarui..." : "Update Password"}
                    </button>
                </div>
            </form>
        </div>
    );
}