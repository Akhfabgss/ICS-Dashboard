"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserProfile, UserRole } from "@/types/users";

interface PegawaiModalProps {
  isOpen: boolean;
  pegawaiToEdit: UserProfile | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PegawaiModal({
  isOpen,
  pegawaiToEdit,
  onClose,
  onSuccess,
}: PegawaiModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("Staff");
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (pegawaiToEdit) {
      setFullName(pegawaiToEdit.full_name || "");
      setEmail(pegawaiToEdit.email || "");
      setPhone(pegawaiToEdit.phone || "");
      setRole(pegawaiToEdit.role || "Staff");
      setPassword("");
    } else {
      setFullName("");
      setEmail("");
      setPhone("");
      setRole("Staff");
      setPassword("");
    }
    setErrorMsg("");
  }, [pegawaiToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg("");

    try {
      if (pegawaiToEdit) {
        // Update Akun Pegawai yang sudah ada
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            phone,
            role,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pegawaiToEdit.id);

        if (error) throw error;
      } else {
        // Buat Akun Pegawai Baru di Supabase Auth
        if (!password || password.length < 6) {
          setErrorMsg("Password minimal 6 karakter!");
          setFormLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
          },
        });

        if (error) throw error;

        // Backup update/upsert ke tabel profiles jika belum ter-trigger otomatis
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: email.trim(),
            full_name: fullName,
            phone: phone,
            role: role,
            updated_at: new Date().toISOString(),
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan akun pegawai.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl space-y-5 border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {pegawaiToEdit ? "Edit Data Pegawai" : "Tambah Akun Pegawai"}
        </h2>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600 text-xs border border-rose-200 dark:bg-rose-500/10 dark:border-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Budi Santoso"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Email Login *
            </label>
            <input
              type="email"
              required
              disabled={!!pegawaiToEdit}
              placeholder="pegawai@framelo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-60"
            />
          </div>

          {!pegawaiToEdit && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Password Pertama *
              </label>
              <input
                type="password"
                required
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Role Hak Akses *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Staff">Staff</option>
                <option value="Bendahara">Bendahara</option>
                <option value="Owner">Owner</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                No. Telepon / WA
              </label>
              <input
                type="text"
                placeholder="08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {formLoading ? "Menyimpan..." : "Simpan Pegawai"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}