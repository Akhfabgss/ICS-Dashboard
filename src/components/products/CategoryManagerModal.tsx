"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ServiceCategory } from "@/types/product";
import Swal from "sweetalert2";
import { Plus, Trash2, Edit2, Check, X, Tag } from "lucide-react";

interface Props {
    categories: ServiceCategory[];
    onRefresh: () => void;
}

export default function CategoryManager({ categories, onRefresh }: Props) {
    const [name, setName] = useState("");
    const [status, setStatus] = useState("Active");
    const [subTypeInput, setSubTypeInput] = useState("");
    const [subTypes, setSubTypes] = useState<string[]>(["OTHER"]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const generateSlug = (text: string) =>
        text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

    // Format input sub-tipe menjadi UPPER_SNAKE_CASE (contoh: "Funko Pop" -> "FUNKO_POP")
    const formatSubTypeCode = (raw: string) =>
        raw
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "_")
            .replace(/(^_|_$)/g, "");

    const handleAddSubTypeTag = () => {
        const formatted = formatSubTypeCode(subTypeInput);
        if (!formatted) return;
        if (!subTypes.includes(formatted)) {
            setSubTypes([...subTypes, formatted]);
        }
        setSubTypeInput("");
    };

    const handleRemoveSubTypeTag = (item: string) => {
        setSubTypes(subTypes.filter((s) => s !== item));
    };

    const resetForm = () => {
        setEditingId(null);
        setName("");
        setStatus("Active");
        setSubTypes(["OTHER"]);
        setSubTypeInput("");
    };

    const handleEditClick = (cat: ServiceCategory) => {
        setEditingId(cat.id);
        setName(cat.name);
        setStatus(cat.status || "Active");
        setSubTypes(cat.sub_types && cat.sub_types.length > 0 ? cat.sub_types : ["OTHER"]);
        setSubTypeInput("");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const finalSubTypes = subTypes.length > 0 ? subTypes : ["OTHER"];
        setSaving(true);

        try {
            if (editingId) {
                const { error } = await supabase
                    .from("product_categories")
                    .update({
                        name: name.trim(),
                        slug: generateSlug(name),
                        status,
                        sub_types: finalSubTypes,
                    })
                    .eq("id", editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("product_categories").insert({
                    name: name.trim(),
                    slug: generateSlug(name),
                    status,
                    sub_types: finalSubTypes,
                });
                if (error) throw error;
            }

            resetForm();
            onRefresh();
            Swal.fire("Berhasil", "Kategori layanan & daftar sub-tipe tersimpan.", "success");
        } catch (err: any) {
            Swal.fire("Gagal", err.message || "Terjadi kesalahan saat menyimpan kategori.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (cat: ServiceCategory) => {
        const confirm = await Swal.fire({
            title: `Hapus kategori "${cat.name}"?`,
            text: "Pastikan tidak ada produk aktif yang memakai kategori ini.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Ya, Hapus",
            cancelButtonText: "Batal",
        });
        if (!confirm.isConfirmed) return;

        const { error } = await supabase.from("product_categories").delete().eq("id", cat.id);
        if (error) {
            Swal.fire("Gagal Menghapus", error.message, "error");
            return;
        }
        onRefresh();
    };

    return (
        <div className="space-y-5 text-xs">
            {/* Form Tambah / Edit Kategori + Sub-Tipe */}
            <form
                onSubmit={handleSave}
                className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 space-y-4"
            >
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                        {editingId ? "Edit Kategori Layanan" : "Tambah Kategori Layanan Baru"}
                    </h3>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="text-gray-500 hover:text-gray-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" /> Batal Edit
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            Nama Kategori Layanan *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Card / TCG, Action Figure, Comics..."
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium"
                        />
                    </div>

                    <div>
                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Input Tag Sub-Tipe Item */}
                <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        Daftar Sub-Tipe Item (Opsi Dropdown di Card Registry)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={subTypeInput}
                            onChange={(e) => setSubTypeInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddSubTypeTag();
                                }
                            }}
                            placeholder="Ketik sub-tipe (misal: POKEMON, FUNKO_POP, DIECAST) lalu Enter..."
                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                        <button
                            type="button"
                            onClick={handleAddSubTypeTag}
                            className="px-3.5 py-2 rounded-xl bg-gray-900 dark:bg-gray-700 text-white font-bold hover:opacity-90 cursor-pointer flex items-center gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" /> Tambah
                        </button>
                    </div>

                    {/* List Badge Sub-Tipe */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {subTypes.map((st) => (
                            <span
                                key={st}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200 font-bold border border-purple-200 dark:border-purple-800"
                            >
                                <Tag className="w-3 h-3" />
                                {st}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveSubTypeTag(st)}
                                    className="hover:text-rose-600 cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold cursor-pointer disabled:opacity-50"
                    >
                        <Check className="w-3.5 h-3.5" />
                        {saving ? "Menyimpan..." : editingId ? "Update Kategori" : "Simpan Kategori"}
                    </button>
                </div>
            </form>

            {/* Tabel Daftar Kategori & Sub-Tipe */}
            <div className="space-y-2">
                {categories.map((cat) => (
                    <div
                        key={cat.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                    >
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-gray-900 dark:text-white">{cat.name}</span>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cat.status === "Active"
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                        }`}
                                >
                                    {cat.status}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {(cat.sub_types && cat.sub_types.length > 0 ? cat.sub_types : ["OTHER"]).map((st) => (
                                    <span
                                        key={st}
                                        className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-[11px]"
                                    >
                                        {st}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                                type="button"
                                onClick={() => handleEditClick(cat)}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                title="Edit Kategori & Sub-Tipe"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(cat)}
                                className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                title="Hapus Kategori"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}