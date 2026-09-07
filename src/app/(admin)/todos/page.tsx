"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types/users";
import Swal from "sweetalert2";

interface SharedTodo {
    id: string;
    owner_id: string; // ID user pemilik card
    title: string;
    is_completed: boolean;
    created_at: string;
}

// Pilihan warna card ala Google Keep
const CARD_COLORS = [
    "bg-amber-500 text-white",
    "bg-emerald-600 text-white",
    "bg-cyan-600 text-white",
    "bg-indigo-600 text-white",
    "bg-rose-500 text-white",
    "bg-purple-600 text-white",
];

export default function SharedTodosPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [todos, setTodos] = useState<SharedTodo[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputMap, setInputMap] = useState<{ [userId: string]: string }>({});

    // State untuk toggle buka/tutup archive per user (misal: { [userId]: true/false })
    const [openArchiveMap, setOpenArchiveMap] = useState<{ [userId: string]: boolean }>({});

    useEffect(() => {
        initData();

        // Listener Realtime Supabase
        const channel = supabase
            .channel("shared_todos_realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "todos" },
                () => {
                    fetchTodosOnly();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const initData = async () => {
        setLoading(true);
        const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, email, role")
            .order("full_name");

        if (profilesData) {
            setUsers(profilesData as UserProfile[]);
        }

        await fetchTodosOnly();
        setLoading(false);
    };

    const fetchTodosOnly = async () => {
        const { data } = await supabase
            .from("todos")
            .select("*")
            .order("created_at", { ascending: true });

        if (data) {
            setTodos(data as SharedTodo[]);
        }
    };

    // Toggle buka/tutup arsip di card user tertentu
    const toggleArchive = (userId: string) => {
        setOpenArchiveMap((prev) => ({
            ...prev,
            [userId]: !prev[userId],
        }));
    };

    // Tambah Task ke Card User
    const handleAddTodoToUser = async (ownerId: string) => {
        const text = inputMap[ownerId]?.trim();
        if (!text) return;

        const { error } = await supabase.from("todos").insert([
            {
                title: text,
                owner_id: ownerId,
                is_completed: false,
            },
        ]);

        if (!error) {
            setInputMap((prev) => ({ ...prev, [ownerId]: "" }));
            fetchTodosOnly();
        } else {
            Swal.fire("Error", error.message, "error");
        }
    };

    // Toggle Status Centang
    const handleToggle = async (id: string, currentStatus: boolean) => {
        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, is_completed: !currentStatus } : t))
        );

        const { error } = await supabase
            .from("todos")
            .update({ is_completed: !currentStatus })
            .eq("id", id);

        if (error) fetchTodosOnly();
    };

    // Hapus Single Item
    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("todos").delete().eq("id", id);
        if (!error) {
            setTodos((prev) => prev.filter((t) => t.id !== id));
        }
    };

    // Bersihkan Semua Task Selesai Khusus di Card User Tersebut
    const handleClearUserCompleted = async (ownerId: string, ownerName: string) => {
        const userCompletedIds = todos
            .filter((t) => t.owner_id === ownerId && t.is_completed)
            .map((t) => t.id);

        if (userCompletedIds.length === 0) return;

        const result = await Swal.fire({
            title: `Bersihkan Selesai (${ownerName})?`,
            text: `Hapus ${userCompletedIds.length} tugas selesai di card ini?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Ya, Hapus!",
            cancelButtonText: "Batal",
        });

        if (result.isConfirmed) {
            const { error } = await supabase
                .from("todos")
                .delete()
                .in("id", userCompletedIds);

            if (!error) {
                setTodos((prev) => prev.filter((t) => !userCompletedIds.includes(t.id)));
            }
        }
    };

    // Mengelompokkan todos berdasarkan owner_id
    const todosByOwner = useMemo(() => {
        const map: { [ownerId: string]: SharedTodo[] } = {};
        todos.forEach((t) => {
            if (!map[t.owner_id]) map[t.owner_id] = [];
            map[t.owner_id].push(t);
        });
        return map;
    }, [todos]);

    return (
        <div className="p-4 sm:p-6 space-y-6 text-gray-900 dark:text-gray-100 min-w-0 max-w-full">
            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    To Do List Tim (Google Keep Style)
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Catatan bersama bersifat terbuka. Semua staf bisa membaca, menambah, dan mengubah catatan di card manapun.
                </p>
            </div>

            {loading ? (
                <p className="text-center text-sm text-gray-400 py-10">Memuat board...</p>
            ) : (
                /* GRID CARDS LAYOUT */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
                    {users.map((user, idx) => {
                        const colorClass = CARD_COLORS[idx % CARD_COLORS.length];
                        const allUserTodos = todosByOwner[user.id] || [];

                        // PISAHKAN AKTIF & SELESAI PER CARD
                        const activeUserTodos = allUserTodos.filter((t) => !t.is_completed);
                        const completedUserTodos = allUserTodos.filter((t) => t.is_completed);
                        const isArchiveOpen = !!openArchiveMap[user.id];
                        const userName = user.full_name || user.email.split("@")[0];

                        return (
                            <div
                                key={user.id}
                                className={`rounded-2xl p-5 shadow-md flex flex-col justify-between min-h-[320px] ${colorClass} transition-transform hover:scale-[1.01]`}
                            >
                                <div className="space-y-4">
                                    {/* JUDUL CARD */}
                                    <h2 className="text-lg font-bold tracking-wide">
                                        To Do List ({userName})
                                    </h2>

                                    {/* 1. DAFTAR TUGAS AKTIF */}
                                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                        {activeUserTodos.length === 0 ? (
                                            <p className="text-xs opacity-75 italic">Tidak ada tugas aktif.</p>
                                        ) : (
                                            activeUserTodos.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="group flex items-center justify-between gap-2 py-1"
                                                >
                                                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.is_completed}
                                                            onChange={() => handleToggle(item.id, item.is_completed)}
                                                            className="w-4 h-4 rounded border-white/40 text-gray-900 focus:ring-0 cursor-pointer accent-white"
                                                        />
                                                        <span className="text-sm break-words">
                                                            {item.title}
                                                        </span>
                                                    </label>

                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="opacity-0 group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded hover:bg-black/20 transition-opacity"
                                                        title="Hapus"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* 2. SECTION TUGAS SELESAI / ARCHIVE (DENGAN ACCORDION) */}
                                    {completedUserTodos.length > 0 && (
                                        <div className="pt-2 border-t border-white/20 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() => toggleArchive(user.id)}
                                                    className="text-xs font-semibold opacity-85 hover:opacity-100 flex items-center gap-1 cursor-pointer"
                                                >
                                                    <span>{isArchiveOpen ? "▼" : "▶"}</span>
                                                    <span>Selesai ({completedUserTodos.length})</span>
                                                </button>

                                                {isArchiveOpen && (
                                                    <button
                                                        onClick={() => handleClearUserCompleted(user.id, userName)}
                                                        className="text-[10px] underline opacity-80 hover:opacity-100 font-medium cursor-pointer"
                                                    >
                                                        Bersihkan
                                                    </button>
                                                )}
                                            </div>

                                            {/* LIST ITEM SELESAI / ARCHIVE */}
                                            {isArchiveOpen && (
                                                <div className="space-y-1.5 pl-2 max-h-[150px] overflow-y-auto pr-1">
                                                    {completedUserTodos.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="group flex items-center justify-between gap-2 py-0.5 opacity-75 hover:opacity-100"
                                                        >
                                                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.is_completed}
                                                                    onChange={() => handleToggle(item.id, item.is_completed)}
                                                                    className="w-4 h-4 rounded border-white/40 text-gray-900 focus:ring-0 cursor-pointer accent-white"
                                                                />
                                                                <span className="text-xs line-through break-words">
                                                                    {item.title}
                                                                </span>
                                                            </label>

                                                            <button
                                                                onClick={() => handleDelete(item.id)}
                                                                className="opacity-0 group-hover:opacity-100 text-xs px-1 rounded hover:bg-black/20 transition-opacity"
                                                                title="Hapus"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* BOTTOM AREA: INPUT & BADGE NAMA */}
                                <div className="mt-4 pt-3 border-t border-white/20 space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Tambah item..."
                                            value={inputMap[user.id] || ""}
                                            onChange={(e) =>
                                                setInputMap((prev) => ({
                                                    ...prev,
                                                    [user.id]: e.target.value,
                                                }))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleAddTodoToUser(user.id);
                                            }}
                                            className="w-full text-xs px-3 py-2 rounded-lg bg-white/20 placeholder-white/70 text-white outline-none focus:bg-white/30"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-white/20">
                                            {userName}
                                        </span>
                                        <span className="text-[10px] opacity-80">
                                            {activeUserTodos.length} Pending
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}