"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, X, UserCheck } from "lucide-react";

export interface CollectorOption {
    id: string;
    username: string;
    display_name: string;
    avatar_bg?: string;
}

interface CollectorSelectDropdownProps {
    collectors: CollectorOption[];
    value: string;
    onChange: (collectorId: string) => void;
}

export default function CollectorSelectDropdown({
    collectors,
    value,
    onChange,
}: CollectorSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement | null>(null);

    const selectedCollector = collectors.find((c) => c.id === value) || null;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = collectors.filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            c.display_name.toLowerCase().includes(q) ||
            c.username.toLowerCase().includes(q)
        );
    });

    return (
        <div ref={containerRef} className="relative">
            <div
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-between gap-2 cursor-pointer focus-within:border-brand-500"
            >
                {selectedCollector ? (
                    <div className="flex items-center gap-2 min-w-0">
                        <span
                            className={`w-5 h-5 rounded-full bg-gradient-to-br ${selectedCollector.avatar_bg || "from-indigo-500 to-purple-600"
                                } text-white text-[10px] font-black flex items-center justify-center shrink-0`}
                        >
                            {selectedCollector.display_name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-bold truncate">{selectedCollector.display_name}</span>
                        <span className="text-[11px] font-mono text-brand-600 dark:text-brand-400 shrink-0">
                            @{selectedCollector.username}
                        </span>
                    </div>
                ) : (
                    <span className="text-gray-400">-- Cari &amp; Pilih Akun Kolektor (Opsional) --</span>
                )}

                {selectedCollector ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange("");
                            setSearch("");
                        }}
                        title="Hapus pilihan kolektor"
                        className="text-gray-400 hover:text-rose-500 p-0.5 cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                )}
            </div>

            {isOpen && (
                <div className="absolute z-40 mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Ketik nama atau @username kolektor..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setIsOpen(false);
                                setSearch("");
                            }}
                            className="w-full px-3 py-2 text-left text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        >
                            -- Tanpa Akun Kolektor --
                        </button>

                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-center text-gray-400">
                                Kolektor tidak ditemukan. Tambahkan dulu di menu Kolektor.
                            </div>
                        ) : (
                            filtered.map((col) => {
                                const isSelected = col.id === value;
                                return (
                                    <button
                                        key={col.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(col.id);
                                            setIsOpen(false);
                                            setSearch("");
                                        }}
                                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-brand-50/60 dark:hover:bg-gray-800 cursor-pointer ${isSelected ? "bg-brand-50 dark:bg-brand-950/40" : ""
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className={`w-6 h-6 rounded-lg bg-gradient-to-br ${col.avatar_bg || "from-indigo-500 to-purple-600"
                                                    } text-white text-[10px] font-black flex items-center justify-center shrink-0`}
                                            >
                                                {col.display_name.charAt(0).toUpperCase()}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="font-bold text-gray-900 dark:text-white truncate">
                                                    {col.display_name}
                                                </div>
                                                <div className="text-[10px] font-mono text-gray-500">
                                                    @{col.username}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && <UserCheck className="w-4 h-4 text-brand-600 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}