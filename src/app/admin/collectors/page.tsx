"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import {
    CollectorRecord,
    AVATAR_BG_OPTIONS,
    COLLECTOR_BADGES,
    getRecommendedBadge,
    getBadgeStyle,
} from "@/types/collector";
import {
    Trophy,
    UserPlus,
    Search,
    Edit2,
    Trash2,
    MapPin,
    Calendar,
    Award,
    Layers,
    Sparkles,
    Eye,
    X,
    CheckCircle2,
} from "lucide-react";

export default function CollectorsPage() {
    const [collectors, setCollectors] = useState<CollectorRecord[]>([]);
    const [cardsByCollector, setCardsByCollector] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [badgeFilter, setBadgeFilter] = useState("");

    // Modal Tambah / Edit State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCollector, setEditingCollector] = useState<CollectorRecord | null>(null);

    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [whatsappNo, setWhatsappNo] = useState("");
    const [location, setLocation] = useState("");
    const [joinDate, setJoinDate] = useState(new Date().toISOString().split("T")[0]);
    const [bio, setBio] = useState("");
    const [avatarBg, setAvatarBg] = useState(AVATAR_BG_OPTIONS[0].value);
    const [manualPoints, setManualPoints] = useState<number>(0);
    const [setsCompleted, setSetsCompleted] = useState<number>(0);
    const [badgeMode, setBadgeMode] = useState<"AUTO" | "MANUAL">("AUTO");
    const [selectedBadge, setSelectedBadge] = useState("Rookie Collector");
    const [saving, setSaving] = useState(false);

    // Modal Detail Koleksi Kartu
    const [viewingCollector, setViewingCollector] = useState<CollectorRecord | null>(null);

    const fetchCollectorsData = async () => {
        setLoading(true);
        try {
            const [colRes, cardsRes] = await Promise.all([
                supabase.from("collectors").select("*").order("created_at", { ascending: false }),
                supabase
                    .from("card_registry")
                    .select("id, cert_number, card_name, set_name, final_grade, grade_label, points, collector_id")
                    .not("collector_id", "is", null),
            ]);

            const groupedCards: Record<string, any[]> = {};
            if (cardsRes.data) {
                cardsRes.data.forEach((c: any) => {
                    if (!groupedCards[c.collector_id]) groupedCards[c.collector_id] = [];
                    groupedCards[c.collector_id].push(c);
                });
            }
            setCardsByCollector(groupedCards);

            if (colRes.data) {
                const enriched = colRes.data.map((col: any) => {
                    const ownedCards = groupedCards[col.id] || [];
                    const totalSlabs = ownedCards.length;
                    const gemMintCount = ownedCards.filter((c) => Number(c.final_grade) >= 9.5).length;

                    // Jumlahkan poin manual yang diinput di tiap kartu pada card_registry
                    const cardPoints = ownedCards.reduce(
                        (sum, c) => sum + (Number(c.points) || 0),
                        0
                    );
                    const totalPoints = (Number(col.manual_points) || 0) + cardPoints;
                    const gemMintRatio = totalSlabs > 0 ? Math.round((gemMintCount / totalSlabs) * 1000) / 10 : 0;

                    return {
                        ...col,
                        manual_points: Number(col.manual_points) || 0,
                        sets_completed: Number(col.sets_completed) || 0,
                        card_points: cardPoints,
                        total_points: totalPoints,
                        total_slabs: totalSlabs,
                        gem_mint_count: gemMintCount,
                        gem_mint_ratio: gemMintRatio,
                        rank: 0,
                    } as CollectorRecord;
                });

                enriched.sort((a, b) => b.total_points - a.total_points || b.total_slabs - a.total_slabs);
                enriched.forEach((item, index) => {
                    item.rank = index + 1;
                });

                setCollectors(enriched);
            }
        } catch (err) {
            console.error("Gagal memuat data kolektor:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCollectorsData();
    }, []);

    const handleOpenModal = (col?: CollectorRecord) => {
        if (col) {
            setEditingCollector(col);
            setUsername(col.username);
            setDisplayName(col.display_name);
            setWhatsappNo(col.whatsapp_no || "");
            setLocation(col.location || "");
            setJoinDate(col.join_date || new Date().toISOString().split("T")[0]);
            setBio(col.bio || "");
            setAvatarBg(col.avatar_bg || AVATAR_BG_OPTIONS[0].value);
            setManualPoints(col.manual_points || 0);
            setSetsCompleted(col.sets_completed || 0);
            setSelectedBadge(col.badge || "Rookie Collector");
            setBadgeMode("MANUAL");
        } else {
            setEditingCollector(null);
            setUsername("");
            setDisplayName("");
            setWhatsappNo("");
            setLocation("");
            setJoinDate(new Date().toISOString().split("T")[0]);
            setBio("");
            setAvatarBg(AVATAR_BG_OPTIONS[Math.floor(Math.random() * AVATAR_BG_OPTIONS.length)].value);
            setManualPoints(0);
            setSetsCompleted(0);
            setBadgeMode("AUTO");
            setSelectedBadge("Rookie Collector");
        }
        setIsModalOpen(true);
    };

    // Hitung simulasi total poin di dalam modal
    const previewTotalPoints = useMemo(() => {
        const existingCardPoints = editingCollector ? editingCollector.card_points : 0;
        return (Number(manualPoints) || 0) + existingCardPoints;
    }, [manualPoints, editingCollector]);

    const effectiveBadge = useMemo(() => {
        return badgeMode === "AUTO" ? getRecommendedBadge(previewTotalPoints) : selectedBadge;
    }, [badgeMode, previewTotalPoints, selectedBadge]);

    const handleSaveCollector = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanUsername = username.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "");
        if (!cleanUsername || !displayName.trim()) {
            Swal.fire("Data Belum Lengkap", "Username dan Display Name wajib diisi.", "warning");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                username: cleanUsername,
                display_name: displayName.trim(),
                whatsapp_no: whatsappNo.trim() || null,
                location: location.trim() || "Indonesia",
                join_date: joinDate || new Date().toISOString().split("T")[0],
                bio: bio.trim() || null,
                avatar_bg: avatarBg,
                manual_points: Number(manualPoints) || 0,
                sets_completed: Number(setsCompleted) || 0,
                badge: effectiveBadge,
                updated_at: new Date().toISOString(),
            };

            if (editingCollector) {
                const { error } = await supabase
                    .from("collectors")
                    .update(payload)
                    .eq("id", editingCollector.id);

                if (error) {
                    if (error.code === "23505") throw new Error("Username kolektor sudah digunakan.");
                    throw error;
                }
                Swal.fire("Berhasil!", `Profil kolektor ${displayName} diperbarui.`, "success");
            } else {
                const { error } = await supabase.from("collectors").insert(payload);

                if (error) {
                    if (error.code === "23505") throw new Error("Username kolektor sudah digunakan.");
                    throw error;
                }
                Swal.fire("Kolektor Ditambahkan!", `${displayName} (@${cleanUsername}) berhasil terdaftar.`, "success");
            }

            setIsModalOpen(false);
            fetchCollectorsData();
        } catch (err: any) {
            Swal.fire("Gagal Menyimpan!", err.message || "Terjadi kesalahan database.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCollector = async (id: string, name: string) => {
        const res = await Swal.fire({
            title: "Hapus Profil Kolektor?",
            text: `Hapus ${name}? Kartu yang terhubung di registry tidak akan terhapus (hanya melepas relasi pemilik).`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#EF4444",
            cancelButtonColor: "#6B7280",
            confirmButtonText: "Ya, Hapus",
            cancelButtonText: "Batal",
        });

        if (res.isConfirmed) {
            const { error } = await supabase.from("collectors").delete().eq("id", id);
            if (!error) {
                Swal.fire("Terhapus!", `Kolektor ${name} berhasil dihapus.`, "success");
                fetchCollectorsData();
            } else {
                Swal.fire("Gagal Hapus!", error.message, "error");
            }
        }
    };

    const filteredCollectors = useMemo(() => {
        return collectors.filter((c) => {
            if (badgeFilter && c.badge !== badgeFilter) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                c.display_name.toLowerCase().includes(q) ||
                c.username.toLowerCase().includes(q) ||
                (c.location || "").toLowerCase().includes(q) ||
                (c.whatsapp_no || "").toLowerCase().includes(q)
            );
        });
    }, [collectors, searchQuery, badgeFilter]);

    const topThree = collectors.slice(0, 3);

    return (
        <div className="space-y-6 text-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Manajemen Kolektor &amp; Peringkat Registry
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                        Kelola akun kolektor, poin reward, tier badge, set selesai, dan statistik rasio Gem Mint.
                    </p>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md transition-all cursor-pointer self-start sm:self-auto"
                >
                    <UserPlus className="w-4 h-4" />
                    Tambah Kolektor Baru
                </button>
            </div>

            {/* Top 3 Leaderboard Cards */}
            {topThree.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topThree.map((col) => (
                        <div
                            key={col.id}
                            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs flex items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${col.avatar_bg} flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm`}
                                >
                                    {col.display_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-black text-[10px]">
                                            #{col.rank}
                                        </span>
                                        <span className="font-black text-gray-900 dark:text-white truncate">
                                            {col.display_name}
                                        </span>
                                    </div>
                                    <div className="text-[11px] font-mono text-gray-500 truncate">@{col.username}</div>
                                    <div className="mt-1">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle(col.badge)}`}>
                                            {col.badge}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right shrink-0">
                                <div className="text-sm font-black text-brand-600 dark:text-brand-400">
                                    {col.total_points.toLocaleString("id-ID")} pts
                                </div>
                                <div className="text-[11px] text-gray-500 font-semibold">
                                    {col.total_slabs} Slabs • {col.gem_mint_ratio}% GM
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filter & Tabel Kolektor */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="relative sm:w-80">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari display name, @username, kota, WA..."
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                            />
                        </div>

                        <select
                            value={badgeFilter}
                            onChange={(e) => setBadgeFilter(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold cursor-pointer focus:outline-none"
                        >
                            <option value="">Semua Tier Badge</option>
                            {COLLECTOR_BADGES.map((b) => (
                                <option key={b.name} value={b.name}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <span className="font-semibold text-gray-500">
                        Total {filteredCollectors.length} Kolektor Terdaftar
                    </span>
                </div>

                {/* Horizontal Scroll Table */}
                <div className="overflow-x-auto pb-2">
                    <table className="w-full min-w-[1150px] text-left">
                        <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="py-3 px-3 text-center whitespace-nowrap">Peringkat</th>
                                <th className="py-3 px-3 whitespace-nowrap">Kolektor &amp; Bio</th>
                                <th className="py-3 px-3 whitespace-nowrap">Badge Tier</th>
                                <th className="py-3 px-3 text-right whitespace-nowrap">Total Points</th>
                                <th className="py-3 px-3 text-center whitespace-nowrap">Total Slab</th>
                                <th className="py-3 px-3 text-center whitespace-nowrap">Gem Mint Ratio</th>
                                <th className="py-3 px-3 text-center whitespace-nowrap">Sets Completed</th>
                                <th className="py-3 px-3 whitespace-nowrap">Lokasi &amp; Join Date</th>
                                <th className="py-3 px-3 text-right whitespace-nowrap">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-gray-400">
                                        Memuat data kolektor...
                                    </td>
                                </tr>
                            ) : filteredCollectors.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-gray-400">
                                        Belum ada data kolektor terdaftar.
                                    </td>
                                </tr>
                            ) : (
                                filteredCollectors.map((col) => (
                                    <tr
                                        key={col.id}
                                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                                    >
                                        {/* 1. Peringkat Registry */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs ${col.rank === 1
                                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                                    : col.rank === 2
                                                        ? "bg-slate-200 text-slate-800 border border-slate-300"
                                                        : col.rank === 3
                                                            ? "bg-orange-100 text-orange-800 border border-orange-300"
                                                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                                                    }`}
                                            >
                                                #{col.rank}
                                            </span>
                                        </td>

                                        {/* 2. Avatar + Display Name + Username + Bio */}
                                        <td className="py-3.5 px-3 max-w-[260px]">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${col.avatar_bg} flex items-center justify-center text-white font-black text-sm shrink-0`}
                                                >
                                                    {col.display_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-black text-gray-900 dark:text-white truncate">
                                                        {col.display_name}
                                                    </div>
                                                    <div className="text-[11px] font-mono text-brand-600 dark:text-brand-400">
                                                        @{col.username}
                                                    </div>
                                                    {col.bio && (
                                                        <div className="text-[10px] text-gray-400 truncate mt-0.5" title={col.bio}>
                                                            {col.bio}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* 3. Badge */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            <span
                                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getBadgeStyle(
                                                    col.badge
                                                )}`}
                                            >
                                                {col.badge}
                                            </span>
                                        </td>

                                        {/* 4. Points */}
                                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                            <div className="font-black text-gray-900 dark:text-white">
                                                {col.total_points.toLocaleString("id-ID")} pts
                                            </div>
                                            <div className="text-[10px] text-gray-400">
                                                Manual: {col.manual_points} • Slab: {col.card_points}
                                            </div>
                                        </td>

                                        {/* 5. Total Slab Koleksi */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => setViewingCollector(col)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black hover:underline cursor-pointer"
                                            >
                                                <Layers className="w-3 h-3" />
                                                {col.total_slabs} Slabs
                                            </button>
                                        </td>

                                        {/* 6. Gem Mint Ratio */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                {col.gem_mint_ratio}%
                                            </span>
                                            <div className="text-[10px] text-gray-400">
                                                ({col.gem_mint_count}/{col.total_slabs} GM)
                                            </div>
                                        </td>

                                        {/* 7. Sets Completed */}
                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <span className="font-bold text-gray-800 dark:text-gray-200">
                                                {col.sets_completed} Sets
                                            </span>
                                        </td>

                                        {/* 8. Location & Join Date */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-medium">
                                                <MapPin className="w-3 h-3 text-gray-400" />
                                                {col.location || "-"}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                                <Calendar className="w-3 h-3" />
                                                Gabung: {col.join_date}
                                            </div>
                                        </td>

                                        {/* 9. Aksi */}
                                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setViewingCollector(col)}
                                                    title="Lihat Daftar Slab Koleksi"
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(col)}
                                                    title="Edit Profil Kolektor"
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCollector(col.id, col.display_name)}
                                                    title="Hapus Kolektor"
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL TAMBAH / EDIT KOLEKTOR */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 my-8">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Award className="w-5 h-5 text-brand-600" />
                                {editingCollector ? "Edit Profil Kolektor" : "Tambah Kolektor Baru"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCollector} className="space-y-4">
                            {/* Preview Avatar & Badge */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white font-black text-lg shadow-sm`}
                                    >
                                        {(displayName || username || "K").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-black text-sm text-gray-900 dark:text-white">
                                            {displayName || "Nama Tampilan Kolektor"}
                                        </div>
                                        <div className="font-mono text-gray-500">
                                            @{username || "username_kolektor"}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getBadgeStyle(effectiveBadge)}`}>
                                        {effectiveBadge}
                                    </span>
                                    <div className="font-black text-brand-600 dark:text-brand-400 mt-1">
                                        Total: {previewTotalPoints.toLocaleString("id-ID")} pts
                                    </div>
                                </div>
                            </div>

                            {/* Baris 1: Username & Display Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold mb-1">Username Kolektor (Unik) *</label>
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="e.g. ash_ketchum99"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold mb-1">Display Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="e.g. Ash Ketchum"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                                    />
                                </div>
                            </div>

                            {/* Baris 2: Lokasi, Join Date, WhatsApp */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-semibold mb-1">Location (Kota / Negara)</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="Jakarta, Indonesia"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold mb-1">Join Date</label>
                                    <input
                                        type="date"
                                        value={joinDate}
                                        onChange={(e) => setJoinDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold mb-1">No. WhatsApp (Opsional)</label>
                                    <input
                                        type="tel"
                                        value={whatsappNo}
                                        onChange={(e) => setWhatsappNo(e.target.value)}
                                        placeholder="0812xxxxxxxx"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Baris 3: Points Manual, Sets Completed, Badge */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-semibold mb-1">Manual / Bonus Points</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={manualPoints}
                                        onChange={(e) => setManualPoints(parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                                    />
                                    {editingCollector && (
                                        <span className="text-[10px] text-gray-400">
                                            + {editingCollector.card_points} pts dari {editingCollector.total_slabs} slab
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-semibold mb-1">Sets Completed</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={setsCompleted}
                                        onChange={(e) => setSetsCompleted(parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold mb-1">Badge Tier</label>
                                    <select
                                        value={badgeMode === "AUTO" ? "AUTO" : selectedBadge}
                                        onChange={(e) => {
                                            if (e.target.value === "AUTO") {
                                                setBadgeMode("AUTO");
                                            } else {
                                                setBadgeMode("MANUAL");
                                                setSelectedBadge(e.target.value);
                                            }
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold cursor-pointer"
                                    >
                                        <option value="AUTO">Otomatis ({getRecommendedBadge(previewTotalPoints)})</option>
                                        {COLLECTOR_BADGES.map((b) => (
                                            <option key={b.name} value={b.name}>
                                                {b.name} ({b.minPoints}+ pts)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Baris 4: Pilihan Warna Avatar (avatarBg) */}
                            <div>
                                <label className="block font-semibold mb-1.5">Avatar Background (avatarBg)</label>
                                <div className="flex flex-wrap gap-2">
                                    {AVATAR_BG_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setAvatarBg(opt.value)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-all ${avatarBg === opt.value
                                                ? "border-brand-600 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300"
                                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                                                }`}
                                        >
                                            <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${opt.value}`} />
                                            {opt.label}
                                            {avatarBg === opt.value && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Baris 5: Bio */}
                            <div>
                                <label className="block font-semibold mb-1">Bio Kolektor</label>
                                <textarea
                                    rows={2}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Deskripsi singkat fokus koleksi (misal: Vintage Base Set & Japanese Promo Collector)..."
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold cursor-pointer disabled:opacity-50"
                                >
                                    {saving ? "Menyimpan..." : "Simpan Profil Kolektor"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DAFTAR SLAB KOLEKSI MILIK KOLEKTOR */}
            {viewingCollector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    Koleksi Slab: {viewingCollector.display_name} (@{viewingCollector.username})
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    Peringkat #{viewingCollector.rank} • {viewingCollector.total_slabs} Total Slabs • Gem Mint Ratio:{" "}
                                    <strong className="text-emerald-600">{viewingCollector.gem_mint_ratio}%</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setViewingCollector(null)}
                                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                            {(cardsByCollector[viewingCollector.id] || []).length === 0 ? (
                                <div className="py-10 text-center text-gray-400">
                                    Belum ada slab kartu yang tertaut ke kolektor ini. Anda dapat menautkannya saat membuat/edit submisi.
                                </div>
                            ) : (
                                (cardsByCollector[viewingCollector.id] || []).map((card: any) => (
                                    <div key={card.id} className="py-2.5 flex items-center justify-between gap-3">
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">{card.card_name}</div>
                                            <div className="text-[11px] text-gray-500">
                                                {card.set_name} • Cert: <span className="font-mono">{card.cert_number}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                                                +{card.points || 0} pts
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 font-black">
                                                {card.final_grade} ({card.grade_label})
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}