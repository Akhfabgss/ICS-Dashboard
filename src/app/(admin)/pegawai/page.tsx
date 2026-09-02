"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { UserProfile, UserRole } from "@/types/users";
import RoleGuard from "@/components/auth/RoleGuard";
import PegawaiModal from "@/components/pegawai/PegawaiModal";
import { Users, UserPlus, Edit, Trash2, Search } from "lucide-react";

export default function PegawaiPage() {
    return (
        <RoleGuard allowedRoles={["Owner"]}>
            <PegawaiContent />
        </RoleGuard>
    );
}

function PegawaiContent() {
    const [pegawaiList, setPegawaiList] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // State Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pegawaiToEdit, setPegawaiToEdit] = useState<UserProfile | null>(null);

    // Fetch Data Pegawai dari Supabase
    const fetchPegawai = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("updated_at", { ascending: false });

        if (!error && data) {
            setPegawaiList(data as UserProfile[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPegawai();
    }, []);

    // Open Modal (Tambah / Edit)
    const handleOpenModal = (pegawai?: UserProfile) => {
        setPegawaiToEdit(pegawai || null);
        setIsModalOpen(true);
    };

    // Hapus Akun Pegawai
    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus akun pegawai ${name}?`)) {
            const { error } = await supabase.from("profiles").delete().eq("id", id);
            if (error) {
                alert("Gagal menghapus: " + error.message);
            } else {
                fetchPegawai();
            }
        }
    };

    // Helper Badge Role
    const getRoleBadge = (userRole: UserRole) => {
        switch (userRole) {
            case "Owner":
                return "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-800";
            case "Bendahara":
                return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800";
            default:
                return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
        }
    };

    // Filter Search
    const filteredPegawai = pegawaiList.filter(
        (p) =>
            p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* 1. HEADER HALAMAN */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-brand-500" />
                        Kelola Akun Pegawai
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manajemen hak akses, akun staf, dan bendahara toko Framelo.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-all shadow-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    Tambah Pegawai
                </button>
            </div>

            {/* 2. STAT CARDS RINGKASAN ROLE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(["Owner", "Bendahara", "Staff"] as UserRole[]).map((r) => {
                    const count = pegawaiList.filter((p) => p.role === r).length;
                    return (
                        <div
                            key={r}
                            className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 flex justify-between items-center"
                        >
                            <div>
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Role {r}
                                </span>
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                                    {count} Akun
                                </h3>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getRoleBadge(r)}`}>
                                {r}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* 3. TABEL PEGAWAI */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Daftar Pegawai Aktif</h3>
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama, email, atau role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                </div>

                {/* Tabel Data */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="p-4">Nama Pegawai</th>
                                <th className="p-4">Email Login</th>
                                <th className="p-4">No. Telepon</th>
                                <th className="p-4">Role / Akses</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-gray-400">
                                        Memuat data pegawai...
                                    </td>
                                </tr>
                            ) : filteredPegawai.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-gray-400">
                                        Tidak ada pegawai ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                filteredPegawai.map((pegawai) => (
                                    <tr key={pegawai.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="p-4 font-semibold text-gray-800 dark:text-white">
                                            {pegawai.full_name}
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300">
                                            {pegawai.email}
                                        </td>
                                        <td className="p-4 text-gray-500 dark:text-gray-400">
                                            {pegawai.phone || "-"}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getRoleBadge(pegawai.role)}`}>
                                                {pegawai.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(pegawai)}
                                                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                                    title="Edit Pegawai"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(pegawai.id, pegawai.full_name)}
                                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                                    title="Hapus Pegawai"
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

            {/* 4. SEPARATE MODAL COMPONENT */}
            <PegawaiModal
                isOpen={isModalOpen}
                pegawaiToEdit={pegawaiToEdit}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchPegawai}
            />
        </div>
    );
}
