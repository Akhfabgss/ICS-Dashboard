"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { UserRole, ROLE_CONFIG } from "@/types/users";
import {
  Users2,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  MapPin,
  AtSign,
} from "lucide-react";

interface ExtendedProfile {
  id: string;
  username: string;
  full_name: string;
  whatsapp_no: string;
  address: string;
  role: UserRole;
  is_profile_completed: boolean;
  active_tasks: number;
  created_at: string;
}

export default function StaffPage() {
  const [profiles, setProfiles] = useState<ExtendedProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"STAFF" | "COLLECTOR" | "ALL">("STAFF");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedProfile | null>(null);
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("SENIOR_GRADER");

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const [profRes, subsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase
          .from("submissions")
          .select("assigned_grader_id, total_cards, status")
          .not("status", "in", '("COMPLETED","REJECTED")'),
      ]);

      // Hitung total kartu aktif per grader
      const taskCountMap: Record<string, number> = {};
      if (subsRes.data) {
        subsRes.data.forEach((sub: any) => {
          if (sub.assigned_grader_id) {
            taskCountMap[sub.assigned_grader_id] =
              (taskCountMap[sub.assigned_grader_id] || 0) + (Number(sub.total_cards) || 1);
          }
        });
      }

      if (!profRes.error && profRes.data) {
        const sanitized: ExtendedProfile[] = profRes.data.map((item: any) => ({
          id: item.id,
          username: item.username || "",
          full_name: item.full_name || "Belum Diisi",
          whatsapp_no: item.whatsapp_no || "",
          address: item.address || "",
          role: (item.role as UserRole) || "COLLECTOR",
          is_profile_completed: Boolean(item.is_profile_completed),
          active_tasks: taskCountMap[item.id] || 0,
          created_at: item.created_at || new Date().toISOString(),
        }));
        setProfiles(sanitized);
      }
    } catch (e) {
      console.error("Gagal memuat profiles:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleOpenModal = (user: ExtendedProfile) => {
    setEditingUser(user);
    setFormName(user.full_name === "Belum Diisi" ? "" : user.full_name);
    setFormUsername(user.username || "");
    setFormPhone(user.whatsapp_no || "");
    setFormAddress(user.address || "");
    setFormRole(user.role || "COLLECTOR");
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const cleanUsername = formUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || null;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formName.trim(),
          username: cleanUsername,
          whatsapp_no: formPhone.trim(),
          address: formAddress.trim() || null,
          role: formRole,
          is_profile_completed: true,
        })
        .eq("id", editingUser.id);

      if (error) {
        if (error.code === "23505") {
          throw new Error("Username sudah dipakai oleh pengguna lain.");
        }
        throw error;
      }

      Swal.fire("Profil Diperbarui!", `Data akun ${formName} berhasil disimpan.`, "success");
      setIsModalOpen(false);
      fetchProfiles();
    } catch (err: any) {
      Swal.fire("Gagal Menyimpan!", err.message || "Periksa policy RLS tabel profiles.", "error");
    }
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: "Hapus Profil Pengguna?",
      text: `Hapus data profil ${name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (!error) {
        setProfiles((prev) => prev.filter((s) => s.id !== id));
        Swal.fire("Terhapus!", `Profil ${name} telah dihapus.`, "success");
      } else {
        Swal.fire("Gagal Hapus!", error.message, "error");
      }
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const isStaff = ["OWNER", "ADMIN", "SENIOR_GRADER", "OPERATOR"].includes(p.role);
    if (roleFilter === "STAFF" && !isStaff) return false;
    // if (roleFilter === "COLLECTOR" && p.role !== "COLLECTOR") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.username || "").toLowerCase().includes(q) ||
      (p.whatsapp_no || "").toLowerCase().includes(q) ||
      (p.address || "").toLowerCase().includes(q) ||
      (p.role || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Users2 className="w-6 h-6 text-brand-600" />
            Manajemen Profil Pengguna &amp; Staff Roles
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Kelola data lengkap profil (Nama, Username, WhatsApp, Alamat) dan hak akses role tim lab maupun kolektor.
          </p>
        </div>

        {/* Tab Filter Role */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold self-start">
          <button
            onClick={() => setRoleFilter("STAFF")}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${roleFilter === "STAFF"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500"
              }`}
          >
            Tim Internal Lab
          </button>
          <button
            onClick={() => setRoleFilter("COLLECTOR")}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${roleFilter === "COLLECTOR"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500"
              }`}
          >
            Kolektor
          </button>
          <button
            onClick={() => setRoleFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${roleFilter === "ALL"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500"
              }`}
          >
            Semua ({profiles.length})
          </button>
        </div>
      </div>

      {/* Tabel Profiles */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, @username, WA, atau alamat..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Menampilkan {filteredProfiles.length} Akun Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400 tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-3">Nama &amp; Username</th>
                <th className="py-3 px-3">Kontak &amp; Alamat</th>
                <th className="py-3 px-3">Role Hak Akses</th>
                <th className="py-3 px-3 text-center">Kelengkapan Profil</th>
                <th className="py-3 px-3 text-center">Task Aktif</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Memuat data profil...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Tidak ada data profil ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((user) => {
                  const roleKey = (user.role || "COLLECTOR").toUpperCase();
                  const roleData = ROLE_CONFIG[roleKey] || {
                    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
                  };

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-3">
                        <div className="font-black text-gray-900 dark:text-white">
                          {user.full_name}
                        </div>
                        <div className="text-[11px] font-mono text-brand-600 dark:text-brand-400">
                          {user.username ? `@${user.username}` : <span className="text-gray-400 italic">tanpa username</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {user.whatsapp_no || "-"}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={user.address}>
                          {user.address || <span className="italic text-gray-400">Alamat belum diisi</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${roleData.badgeClass}`}
                        >
                          {roleKey}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${user.is_profile_completed
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"
                            }`}
                        >
                          {user.is_profile_completed ? (
                            <>
                              <CheckCircle className="w-3 h-3" /> Lengkap
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Belum Lengkap
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-black px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
                          {user.active_tasks} Kartu
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenModal(user)}
                            title="Edit Profil & Role"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(user.id, user.full_name)}
                            title="Hapus Profil"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT PROFIL & ROLE */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Edit Profil &amp; Role Pengguna
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Budi Santoso"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 flex items-center gap-1">
                  <AtSign className="w-3.5 h-3.5 text-brand-600" />
                  Username (Unik)
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. budi_grader"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">No. WhatsApp / HP *</label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Alamat pengiriman / domisili..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Role Jabatan (Hak Akses) *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold cursor-pointer"
                >
                  <option value="OWNER">OWNER (Full Akses Keuangan &amp; Pegawai)</option>
                  <option value="ADMIN">ADMIN (Submisi, Keuangan, Stok, Produk)</option>
                  <option value="SENIOR_GRADER">SENIOR_GRADER (Input 4 Sub-grade &amp; Registri)</option>
                  <option value="OPERATOR">OPERATOR (Enkapsulasi Slab, NFC &amp; Kurir)</option>
                  <option value="COLLECTOR">COLLECTOR (Pelanggan / Kolektor Umum)</option>
                </select>
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
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}