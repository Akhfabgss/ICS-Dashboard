"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Swal from "sweetalert2";
import { ArrowLeft, Trash2 } from "lucide-react";
import { UserProfile } from "@/types/users";

interface ProductOption {
    id: string;
    name: string;
    price: number;
}

interface AddonOption {
    id: string;
    name: string;
    price: number;
}

const DEFAULT_DESIGN_FIELDS = [
    { key: "Nama Gunung / Lokasi", value: "" },
    { key: "Via / Jalur", value: "" },
    { key: "Nama Pemesan / Pendaki", value: "" },
    { key: "Tanggal", value: "" },
    { key: "Ketinggian / Jarak", value: "" },
    { key: "Quotes", value: "" },
    { key: "Link Foto (Drive)", value: "" },
];

export default function EditOrderPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [productList, setProductList] = useState<ProductOption[]>([]);
    const [addonList, setAddonList] = useState<AddonOption[]>([]);
    const [staffList, setStaffList] = useState<UserProfile[]>([]);

    // Form States
    const [orderNumber, setOrderNumber] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [category, setCategory] = useState("PENDAKIAN");
    const [productName, setProductName] = useState("");
    const [orderSource, setOrderSource] = useState("WhatsApp");
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [assignedTo, setAssignedTo] = useState("");

    const [framePrice, setFramePrice] = useState<number>(0);
    const [shippingFee, setShippingFee] = useState<number>(0);
    const [discountPercent, setDiscountPercent] = useState<number>(0);
    const [dpAmount, setDpAmount] = useState<number>(0);
    const [repaymentAmount, setRepaymentAmount] = useState<number>(0);

    const [designFields, setDesignFields] = useState(DEFAULT_DESIGN_FIELDS);
    const [shippingMethod, setShippingMethod] = useState("JNE");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Ambil role user login
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from("profiles").select("role").eq("id", session.user.id).single();
                if (profile?.role) {
                    setUserRole(String(profile.role).toLowerCase().trim());
                }
            }

            const [prodRes, addRes, orderRes, staffRes] = await Promise.all([
                supabase.from("products").select("id, name, price").order("name"),
                supabase.from("add_ons").select("id, name, price").order("name"),
                supabase.from("orders").select("*").eq("id", orderId).single(),
                supabase.from("profiles")
                    .select("id, full_name, email, role")
                    .order("full_name"),
            ]);

            if (prodRes.data) setProductList(prodRes.data);
            if (addRes.data) setAddonList(addRes.data);
            if (staffRes.data) setStaffList(staffRes.data as UserProfile[]);

            if (orderRes.data) {
                const o = orderRes.data;
                setOrderNumber(o.order_number || "");
                setCustomerName(o.customer_name || "");
                setPhoneNumber(o.phone_number || "");
                setAddress(o.address || "");
                setCategory(o.category || "PENDAKIAN");
                setProductName(o.product_name || "");
                setOrderSource(o.order_source || "WhatsApp");
                setSelectedAddons(o.add_ons || []);
                setAssignedTo(o.assigned_to || "");
                setFramePrice(Number(o.frame_price || 0));
                setShippingFee(Number(o.shipping_fee || 0));
                setDiscountPercent(Number(o.discount_percent || 0));
                setDpAmount(Number(o.dp_amount || 0));
                setRepaymentAmount(Number(o.repayment_amount || 0));
                setShippingMethod(o.shipping_method || "JNE");
                setNotes(o.notes || "");

                if (o.design_data) {
                    try {
                        const parsed = JSON.parse(o.design_data);
                        if (Array.isArray(parsed) && parsed.length > 0) setDesignFields(parsed);
                    } catch {
                        setDesignFields(DEFAULT_DESIGN_FIELDS);
                    }
                }
            } else {
                Swal.fire("Error", "Data pesanan tidak ditemukan.", "error");
                router.push("/orders");
            }

            setLoading(false);
        };

        if (orderId) fetchData();
    }, [orderId, router]);

    const normalizedRole = (userRole || "").toLowerCase().trim();
    const isFinanceVisible = normalizedRole !== "staff" && normalizedRole !== "designer" && normalizedRole !== "";

    const handleProductSelect = (selectedName: string) => {
        setProductName(selectedName);
        const found = productList.find((p) => p.name === selectedName);
        if (found) setFramePrice(Number(found.price || 0));
    };

    const toggleAddon = (addonName: string) => {
        setSelectedAddons((prev) =>
            prev.includes(addonName) ? prev.filter((a) => a !== addonName) : [...prev, addonName]
        );
    };

    const addonsPrice = selectedAddons.reduce((acc, name) => {
        const item = addonList.find((a) => a.name === name);
        return acc + (item ? Number(item.price) : 0);
    }, 0);

    const subtotal = framePrice + addonsPrice + shippingFee;
    const discountAmount = Math.round(subtotal * (discountPercent / 100));
    const totalPrice = subtotal - discountAmount;
    const remainingPayment = totalPrice - (dpAmount + repaymentAmount);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await Swal.fire({
            title: "Simpan Perubahan?",
            text: "Apakah kamu yakin ingin memperbarui data pesanan ini?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#aaa",
            confirmButtonText: "Ya, Simpan!",
            cancelButtonText: "Batal",
        });
        if (!result.isConfirmed) return;

        setSubmitting(true);

        const basePayload: Record<string, unknown> = {
            customer_name: customerName.trim(),
            phone_number: phoneNumber.trim(),
            address,
            category,
            product_name: productName,
            order_source: orderSource,
            add_ons: selectedAddons,
            assigned_to: assignedTo || null,
            design_data: JSON.stringify(designFields),
            shipping_method: shippingMethod,
            notes,
        };

        if (isFinanceVisible) {
            basePayload.frame_price = framePrice;
            basePayload.addons_price = addonsPrice;
            basePayload.shipping_fee = shippingFee;
            basePayload.discount_percent = discountPercent;
            basePayload.discount_amount = discountAmount;
            basePayload.dp_amount = dpAmount;
            basePayload.repayment_amount = repaymentAmount;
        }

        const { error } = await supabase.from("orders").update(basePayload).eq("id", orderId);
        setSubmitting(false);

        if (error) {
            Swal.fire("Error", "Gagal memperbarui pesanan: " + error.message, "error");
        } else {
            Swal.fire("Berhasil!", "Data pesanan berhasil diperbarui.", "success");
            router.push("/orders");
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-gray-500">Memuat data pesanan...</div>;
    }

    return (
        <div className="mx-auto space-y-6 pb-12 p-4 sm:p-6">
            {/* HEADER */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Edit Pesanan ({orderNumber})</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Perbarui data pesanan produk dan rincian transaksi.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. DATA PEMESAN */}
                <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">1. Informasi Pemesan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block font-medium mb-1">Nama Pemesan *</label>
                            <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 outline-none focus:border-brand-500" />
                        </div>
                        <div>
                            <label className="block font-medium mb-1">No. WhatsApp *</label>
                            <input type="text" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 outline-none focus:border-brand-500" />
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Dikerjakan Oleh</label>
                            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-900 outline-none focus:border-brand-500">
                                <option value="">— Belum Ditugaskan —</option>
                                {staffList.map((s) => (
                                    <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="text-sm">
                        <label className="block font-medium mb-1">Alamat Pengiriman</label>
                        <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)}
                            className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 outline-none focus:border-brand-500" />
                    </div>
                </div>

                {/* 2. PRODUK & ADD-ONS */}
                <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">2. Pilihan Produk &amp; Add-ons</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <label className="block font-medium mb-1">Kategori Desain *</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-900 outline-none focus:border-brand-500 font-medium">
                                <option value="PENDAKIAN">PENDAKIAN (P)</option>
                                <option value="RUNNING">RUNNING (R)</option>
                                <option value="SEPEDA">SEPEDA (S)</option>
                                <option value="TOURING">TOURING (T)</option>
                                <option value="CUSTOM">CUSTOM (C)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Pilih Produk Frame *</label>
                            <select value={productName} onChange={(e) => handleProductSelect(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-900 outline-none focus:border-brand-500 font-medium">
                                {productList.map((p) => (
                                    <option key={p.id} value={p.name}>
                                        {p.name} {isFinanceVisible ? `(Rp ${p.price.toLocaleString("id-ID")})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Order Lewat *</label>
                            <select value={orderSource} onChange={(e) => setOrderSource(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-900 outline-none focus:border-brand-500">
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Shopee">Shopee</option>
                                <option value="Tokopedia">Tokopedia</option>
                                <option value="TikTok Shop">TikTok Shop</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block font-medium mb-2 text-sm">Pilih Tambahan / Add-ons</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {addonList.map((item) => (
                                <label key={item.id}
                                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-sm transition-colors ${selectedAddons.includes(item.name) ? "border-brand-500 bg-brand-50/20 dark:bg-brand-500/10 font-medium" : "border-gray-200 dark:border-gray-800"}`}>
                                    <input type="checkbox" checked={selectedAddons.includes(item.name)} onChange={() => toggleAddon(item.name)}
                                        className="rounded text-brand-500 focus:ring-brand-500 w-4 h-4" />
                                    <span>
                                        {item.name} {isFinanceVisible ? `(+Rp ${item.price.toLocaleString("id-ID")})` : ""}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. RINCIAN KEUANGAN — hanya untuk Owner/Bendahara */}
                {isFinanceVisible && (
                    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                        <h3 className="font-bold text-gray-800 dark:text-white text-base">3. Rincian Pembayaran</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <label className="block font-medium mb-1">Harga Frame (Rp)</label>
                                <input type="number" value={framePrice} onChange={(e) => setFramePrice(Number(e.target.value))}
                                    className="w-full rounded-xl border p-2.5 bg-transparent font-bold text-brand-600 dark:text-brand-400 dark:border-gray-700" />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Ongkir (Rp)</label>
                                <input type="number" value={shippingFee} onChange={(e) => setShippingFee(Number(e.target.value))} placeholder="0"
                                    className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700" />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Diskon (%)</label>
                                <input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} placeholder="0"
                                    className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 text-rose-500 font-semibold" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2">
                            <div>
                                <label className="block font-medium mb-1">Bayar DP (Rp)</label>
                                <input type="number" value={dpAmount} onChange={(e) => setDpAmount(Number(e.target.value))}
                                    className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700" />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Pelunasan (Rp)</label>
                                <input type="number" value={repaymentAmount} onChange={(e) => setRepaymentAmount(Number(e.target.value))}
                                    className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700" />
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 flex justify-between text-sm font-semibold">
                            <span>Total Harga: Rp {totalPrice.toLocaleString("id-ID")}{discountPercent > 0 && ` (diskon ${discountPercent}%)`}</span>
                            <span className={remainingPayment <= 0 ? "text-emerald-500" : "text-rose-500"}>
                                Sisa: Rp {remainingPayment.toLocaleString("id-ID")} ({remainingPayment <= 0 ? "LUNAS" : "BELUM LUNAS"})
                            </span>
                        </div>
                    </div>
                )}

                {/* 4. ISIAN DATA DESAIN */}
                <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 dark:text-white text-base">
                            {isFinanceVisible ? "4." : "3."} Data Isian Desain
                        </h3>
                        <button type="button" onClick={() => setDesignFields([...designFields, { key: "", value: "" }])}
                            className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                            + Tambah Poin Custom
                        </button>
                    </div>
                    <div className="space-y-2">
                        {designFields.map((field, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <input type="text" placeholder="Nama Poin" value={field.key}
                                    onChange={(e) => { const u = [...designFields]; u[index].key = e.target.value; setDesignFields(u); }}
                                    className="w-1/3 rounded-xl border p-2 text-sm bg-transparent dark:border-gray-700 font-semibold" />
                                <input type="text" placeholder="Isi data..." value={field.value}
                                    onChange={(e) => { const u = [...designFields]; u[index].value = e.target.value; setDesignFields(u); }}
                                    className="flex-1 rounded-xl border p-2 text-sm bg-transparent dark:border-gray-700" />
                                <button type="button" onClick={() => setDesignFields(designFields.filter((_, i) => i !== index))}
                                    className="p-2 text-rose-500 hover:text-rose-700">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => router.back()}
                        className="px-6 py-3 rounded-xl border dark:border-gray-700 font-medium text-sm">
                        Batal
                    </button>
                    <button type="submit" disabled={submitting}
                        className="px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors">
                        {submitting ? "Menyimpan..." : "Perbarui Pesanan"}
                    </button>
                </div>
            </form>
        </div>
    );
}