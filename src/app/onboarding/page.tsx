"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User, Phone, ShieldCheck, ArrowRight, Loader2, AtSign, MapPin } from "lucide-react";

export default function StaffOnboardingPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [whatsappNo, setWhatsappNo] = useState("");
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const initOnboarding = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    router.replace("/signin");
                    return;
                }

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name, username, whatsapp_no, address, is_profile_completed")
                    .eq("id", session.user.id)
                    .single();

                if (profile) {
                    if (profile.full_name) setFullName(profile.full_name);
                    if (profile.username) setUsername(profile.username);
                    if (profile.whatsapp_no) setWhatsappNo(profile.whatsapp_no);
                    if (profile.address) setAddress(profile.address);

                    if (profile.is_profile_completed) {
                        router.replace("/admin/dashboard");
                        return;
                    }
                } else if (session.user.email) {
                    // Auto-suggest username dari prefix email
                    setUsername(session.user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, ""));
                }
            } catch (err) {
                console.error("Error init onboarding:", err);
            } finally {
                setLoading(false);
            }
        };

        initOnboarding();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Sesi pengguna tidak ditemukan. Silakan login ulang.");

            const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || null;

            const { data: updatedProfile, error: updateError } = await supabase
                .from("profiles")
                .upsert(
                    {
                        id: user.id,
                        username: cleanUsername,
                        full_name: fullName.trim(),
                        whatsapp_no: whatsappNo.trim(),
                        address: address.trim() || null,
                        is_profile_completed: true,
                        role: "ADMIN",
                    },
                    { onConflict: "id" }
                )
                .select("is_profile_completed")
                .single();

            if (updateError) {
                if (updateError.code === "23505") {
                    throw new Error("Username sudah digunakan akun lain. Silakan pilih username berbeda.");
                }
                throw new Error(updateError.message || "Gagal memperbarui profil di database.");
            }

            if (!updatedProfile?.is_profile_completed) {
                throw new Error("Penyimpanan belum terverifikasi oleh server. Coba lagi.");
            }

            router.replace("/admin/dashboard");
        } catch (err: any) {
            setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan data.");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                    <span className="text-sm font-semibold">Memeriksa Sesi Staff...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
            <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 p-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 font-bold mb-2 border border-brand-500/20">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-black text-white">Aktivasi Akun Staff ICS</h1>
                    <p className="text-xs text-gray-400">
                        Lengkapi identitas dan kontak Anda untuk keperluan log audit &amp; penugasan lab.
                    </p>
                </div>

                {errorMsg && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-800 text-rose-400 text-xs font-medium text-center">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div>
                        <label className="block font-bold text-gray-300 mb-1.5">
                            Nama Lengkap Staff <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3.5 top-3 text-gray-500" />
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Contoh: Budi Santoso"
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800 text-white font-medium focus:outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-gray-300 mb-1.5">
                            Username <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <AtSign className="w-4 h-4 absolute left-3.5 top-3 text-gray-500" />
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="budi_grader"
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800 text-white font-mono focus:outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-gray-300 mb-1.5">
                            Nomor WhatsApp Internal <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <Phone className="w-4 h-4 absolute left-3.5 top-3 text-gray-500" />
                            <input
                                type="tel"
                                required
                                value={whatsappNo}
                                onChange={(e) => setWhatsappNo(e.target.value)}
                                placeholder="081234567890"
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800 text-white font-medium focus:outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-gray-300 mb-1.5">
                            Alamat Domisili / Cabang Lab
                        </label>
                        <div className="relative">
                            <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-gray-500" />
                            <textarea
                                rows={2}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Opsional: Alamat domisili atau lokasi lab..."
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-700 bg-gray-800 text-white font-medium focus:outline-none focus:border-brand-500 resize-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full mt-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Menyimpan ke Database...
                            </>
                        ) : (
                            <>
                                Simpan &amp; Masuk Dashboard Staff
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}