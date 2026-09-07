"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Todo } from "@/types/todo";
import Swal from "sweetalert2";

export default function TodosPage() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [showCompleted, setShowCompleted] = useState(false);

    // 1. Fetch Data Awal & Set Realtime Listener
    useEffect(() => {
        fetchTodos();

        // Listener Realtime Supabase
        const channel = supabase
            .channel("todos_realtime_page")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "todos" },
                () => {
                    fetchTodos();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchTodos = async () => {
        setLoading(true);
        // RLS Supabase otomatis menyaring hanya data milik user yang sedang login
        const { data, error } = await supabase
            .from("todos")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setTodos(data as Todo[]);
        }
        setLoading(false);
    };

    // 2. Tambah Catatan Baru
    const handleAddTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
            Swal.fire("Error", "Kamu harus login terlebih dahulu", "error");
            return;
        }

        const { error } = await supabase.from("todos").insert([
            {
                title: newTitle.trim(),
                user_id: session.user.id,
            },
        ]);

        if (error) {
            Swal.fire("Error!", "Gagal menambah tugas: " + error.message, "error");
        } else {
            setNewTitle("");
            fetchTodos();
        }
    };

    // 3. Toggle Centang Selesai / Belum
    const handleToggleTodo = async (id: string, currentStatus: boolean) => {
        // Update Optimistik di UI biar responsif
        setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, is_completed: !currentStatus } : t))
        );

        const { error } = await supabase
            .from("todos")
            .update({ is_completed: !currentStatus })
            .eq("id", id);

        if (error) {
            fetchTodos(); // Rollback jika ada error DB
        }
    };

    // 4. Hapus Satu Tugas
    const handleDeleteTodo = async (id: string) => {
        const { error } = await supabase.from("todos").delete().eq("id", id);
        if (!error) {
            setTodos((prev) => prev.filter((t) => t.id !== id));
        }
    };

    // 5. Bersihkan Semua Tugas Selesai (Clear Archive)
    const handleClearCompleted = async () => {
        const completedIds = todos.filter((t) => t.is_completed).map((t) => t.id);
        if (completedIds.length === 0) return;

        const result = await Swal.fire({
            title: "Bersihkan Tugas Selesai?",
            text: `Apakah kamu yakin ingin menghapus ${completedIds.length} tugas yang sudah selesai secara permanen?`,
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
                .in("id", completedIds);

            if (!error) {
                setTodos((prev) => prev.filter((t) => !t.is_completed));
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Tugas selesai berhasil dibersihkan!",
                    showConfirmButton: false,
                    timer: 2000,
                });
            }
        }
    };

    // Pisahkan Data Aktif & Selesai
    const activeTodos = useMemo(() => todos.filter((t) => !t.is_completed), [todos]);
    const completedTodos = useMemo(() => todos.filter((t) => t.is_completed), [todos]);

    return (
        <div className="p-4 sm:p-6 space-y-6 text-gray-900 dark:text-gray-100 max-w-4xl mx-auto min-w-0">
            {/* HEADER PAGES */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 dark:border-gray-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Catatan &amp; To-Do Pribadi
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Kelola daftar tugas harian kamu. Catatan ini hanya bisa dilihat oleh akun kamu.
                    </p>
                </div>
                <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                    {activeTodos.length} Tugas Aktif
                </span>
            </div>

            {/* FORM INPUT TUGAS BARU */}
            <form onSubmit={handleAddTodo} className="flex gap-2">
                <input
                    type="text"
                    placeholder="Tulis catatan atau tugas baru kamu di sini..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="h-11 flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm outline-none focus:border-brand-500 dark:text-white shadow-xs"
                />
                <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="h-11 px-5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer shadow-xs"
                >
                    + Tambah
                </button>
            </form>

            {/* SECTION TUGAS AKTIF */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 shadow-xs space-y-3">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Tugas Aktif ({activeTodos.length})
                </h2>

                <div className="space-y-2">
                    {loading ? (
                        <p className="text-xs text-center py-6 text-gray-400">Memuat catatan...</p>
                    ) : activeTodos.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 space-y-1">
                            <p className="text-sm font-medium italic">Semua tugas aktif sudah selesai!</p>
                            <p className="text-xs">Tulis tugas baru pada kolom di atas.</p>
                        </div>
                    ) : (
                        activeTodos.map((todo) => (
                            <div
                                key={todo.id}
                                className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 transition-all"
                            >
                                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                    <input
                                        type="checkbox"
                                        checked={todo.is_completed}
                                        onChange={() => handleToggleTodo(todo.id, todo.is_completed)}
                                        className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                        {todo.title}
                                    </span>
                                </label>

                                <button
                                    onClick={() => handleDeleteTodo(todo.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition-opacity cursor-pointer text-sm"
                                    title="Hapus Tugas"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* SECTION TUGAS SELESAI (ARCHIVE / ACCORDION) */}
            {completedTodos.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setShowCompleted(!showCompleted)}
                            className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                        >
                            <span>{showCompleted ? "▼" : "▶"}</span>
                            <span>Tugas Selesai / Arsip ({completedTodos.length})</span>
                        </button>

                        {showCompleted && (
                            <button
                                onClick={handleClearCompleted}
                                className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
                            >
                                Bersihkan Semua
                            </button>
                        )}
                    </div>

                    {showCompleted && (
                        <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                            {completedTodos.map((todo) => (
                                <div
                                    key={todo.id}
                                    className="group flex items-center justify-between p-2.5 rounded-lg bg-gray-50/60 dark:bg-gray-800/30"
                                >
                                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={todo.is_completed}
                                            onChange={() => handleToggleTodo(todo.id, todo.is_completed)}
                                            className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                                        />
                                        <span className="text-sm text-gray-400 dark:text-gray-500 line-through truncate">
                                            {todo.title}
                                        </span>
                                    </label>

                                    <button
                                        onClick={() => handleDeleteTodo(todo.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition-opacity cursor-pointer text-xs"
                                        title="Hapus Permanent"
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
    );
}