"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { UserProfile } from "@/types/users";
import { MasterProduct, ServiceCategory } from "@/types/product";
import { syncSubmissionToCashFlow } from "@/lib/financeSync";
import CollectorSelectDropdown, {
    CollectorOption,
} from "@/components/submissions/CollectorSelectDropdown";
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Calculator,
    Layers,
    User,
    Package,
    Award,
} from "lucide-react";

export interface CardItemInput {
    tempId: string;
    collector_id: string;
    points: number;
    card_name: string;
    set_name: string;
    card_number: string;
    language: string;
    tcg_type: string;
    sub_centering: number;
    sub_corners: number;
    sub_edges: number;
    sub_surface: number;
    final_grade: number;
    grade_label: string;
    front_image_url: string;
    back_image_url: string;
    nfc_uid: string;
    grader_notes: string;
}

export default function CreateSubmissionPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [staffList, setStaffList] = useState<UserProfile[]>([]);
    const [collectorsList, setCollectorsList] = useState<CollectorOption[]>([]);

    // Master Produk & Kategori dari Database Supabase
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [allProducts, setAllProducts] = useState<MasterProduct[]>([]);

    // 1. Informasi Pemesan
    const [collectorName, setCollectorName] = useState("");
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [assignedGraderId, setAssignedGraderId] = useState("");
    const [address, setAddress] = useState("");
    const [courierService, setCourierService] = useState("JNE");

    // 2. Pilihan Produk
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedProductId, setSelectedProductId] = useState("");
    const [orderChannel, setOrderChannel] = useState("WhatsApp");

    // 3. Rincian Pembayaran
    const [productUnitPrice, setProductUnitPrice] = useState<number>(0);
    const [shippingCost, setShippingCost] = useState<number>(0);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [dpAmount, setDpAmount] = useState<number>(0);
    const [manualRepaymentInput, setManualRepaymentInput] = useState<number | "">("");

    // Ambil daftar sub_types langsung dari baris product_categories yang dipilih
    const dynamicSubTypeOptions = useMemo(() => {
        const activeCatObj = categories.find((c) => c.name === selectedCategory);
        if (activeCatObj?.sub_types && activeCatObj.sub_types.length > 0) {
            return activeCatObj.sub_types;
        }
        return ["OTHER"];
    }, [categories, selectedCategory]);

    // 4. Data Isian Item (Card Registry List)
    const [cards, setCards] = useState<CardItemInput[]>([
        {
            tempId: `card-${Date.now()}`,
            collector_id: "",
            points: 0,
            card_name: "",
            set_name: "",
            card_number: "",
            language: "Japanese",
            tcg_type: "OTHER",
            sub_centering: 0,
            sub_corners: 0,
            sub_edges: 0,
            sub_surface: 0,
            final_grade: 0,
            grade_label: "Pending Assessment",
            front_image_url: "",
            back_image_url: "",
            nfc_uid: "",
            grader_notes: "",
        },
    ]);

    // Fetch Master Data (Kategori + sub_types, Produk, Staff, Kolektor)
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [catRes, prodRes, staffRes, colRes] = await Promise.all([
                    supabase.from("product_categories").select("*").eq("status", "Active"),
                    supabase.from("products").select("*").eq("is_active", true),
                    supabase.from("profiles").select("*").in("role", ["SENIOR_GRADER", "OPERATOR", "ADMIN", "OWNER"]),
                    supabase
                        .from("collectors")
                        .select("id, username, display_name, avatar_bg")
                        .order("display_name", { ascending: true }),
                ]);

                if (catRes.data && catRes.data.length > 0) {
                    const cats = catRes.data as ServiceCategory[];
                    const initialCat = cats[0];
                    setCategories(cats);
                    setSelectedCategory(initialCat.name);

                    const defaultSubType =
                        initialCat.sub_types && initialCat.sub_types.length > 0
                            ? initialCat.sub_types[0]
                            : "OTHER";
                    setCards((prev) => prev.map((c) => ({ ...c, tcg_type: defaultSubType })));
                }

                if (prodRes.data && prodRes.data.length > 0) {
                    setAllProducts(prodRes.data as MasterProduct[]);
                }

                if (staffRes.data && staffRes.data.length > 0) {
                    setStaffList(staffRes.data as UserProfile[]);
                    setAssignedGraderId(staffRes.data[0].id);
                }

                if (colRes.data) {
                    setCollectorsList(colRes.data as CollectorOption[]);
                }
            } catch (err) {
                console.error("Gagal memuat master data:", err);
            }
        };
        fetchMasterData();
    }, []);

    // Handler saat Kategori Layanan di Bagian 2 diubah -> Sinkronkan opsi tcg_type dari database
    const handleCategoryChange = (newCategory: string) => {
        setSelectedCategory(newCategory);
        setSelectedProductId("");
        setProductUnitPrice(0);

        const nextCatObj = categories.find((c) => c.name === newCategory);
        const defaultSubType =
            nextCatObj?.sub_types && nextCatObj.sub_types.length > 0
                ? nextCatObj.sub_types[0]
                : "OTHER";
        setCards((prev) => prev.map((c) => ({ ...c, tcg_type: defaultSubType })));
    };

    // Filter Produk Berdasarkan Kategori yang Dipilih
    const availableProducts = useMemo(() => {
        return allProducts.filter((p) => p.category_name === selectedCategory);
    }, [allProducts, selectedCategory]);

    const handleProductSelect = (prodId: string) => {
        setSelectedProductId(prodId);
        const prod = allProducts.find((p) => p.id === prodId);
        if (prod) {
            setProductUnitPrice(prod.price);
        } else {
            setProductUnitPrice(0);
        }
    };

    // Kalkulasi Total Pembayaran
    const totalCardsCount = cards.length;
    const baseSubtotal = productUnitPrice * totalCardsCount;
    const grandTotal = Math.max(0, baseSubtotal + Number(shippingCost) - Number(discountAmount));
    const autoRemainingPayment = Math.max(0, grandTotal - Number(dpAmount));

    const finalRemainingPayment = useMemo(() => {
        if (manualRepaymentInput !== "") {
            const paidExtra = Number(manualRepaymentInput);
            return Math.max(0, autoRemainingPayment - paidExtra);
        }
        return autoRemainingPayment;
    }, [autoRemainingPayment, manualRepaymentInput]);

    const paymentStatus = useMemo(() => {
        if (grandTotal === 0) return "UNPAID";
        const totalPaid =
            Number(dpAmount) + (manualRepaymentInput !== "" ? Number(manualRepaymentInput) : 0);
        if (totalPaid >= grandTotal) return "PAID";
        if (dpAmount > 0) return "DP";
        return "UNPAID";
    }, [dpAmount, manualRepaymentInput, grandTotal]);

    // Dynamic Card Registry Functions
    const handleAddCardRow = () => {
        const defaultCollectorId = cards[0]?.collector_id || "";
        const defaultSubType = dynamicSubTypeOptions[0] || "OTHER";
        setCards([
            ...cards,
            {
                tempId: `card-${Date.now()}`,
                collector_id: defaultCollectorId,
                points: 0,
                card_name: "",
                set_name: "",
                card_number: "",
                language: "Japanese",
                tcg_type: defaultSubType,
                sub_centering: 0,
                sub_corners: 0,
                sub_edges: 0,
                sub_surface: 0,
                final_grade: 0,
                grade_label: "Pending Assessment",
                front_image_url: "",
                back_image_url: "",
                nfc_uid: "",
                grader_notes: "",
            },
        ]);
    };

    const handleRemoveCardRow = (tempId: string) => {
        if (cards.length === 1) {
            Swal.fire("Peringatan", "Minimal harus ada 1 item dalam pesanan.", "warning");
            return;
        }
        setCards((prev) => prev.filter((c) => c.tempId !== tempId));
    };

    const handleCardChange = (tempId: string, field: keyof CardItemInput, value: any) => {
        setCards((prev) =>
            prev.map((c) => {
                if (c.tempId !== tempId) return c;
                const updatedCard = { ...c, [field]: value };

                if (field.startsWith("sub_")) {
                    const centering = Number(updatedCard.sub_centering) || 0;
                    const corners = Number(updatedCard.sub_corners) || 0;
                    const edges = Number(updatedCard.sub_edges) || 0;
                    const surface = Number(updatedCard.sub_surface) || 0;

                    if (centering > 0 || corners > 0 || edges > 0 || surface > 0) {
                        const avg = (centering + corners + edges + surface) / 4;
                        const minVal = Math.min(centering, corners, edges, surface);
                        const finalG = Math.round(Math.min(avg, minVal + 1) * 2) / 2;

                        let label = "Ungraded";
                        if (finalG === 10) label = "GEM MINT";
                        else if (finalG >= 9.5) label = "MINT+";
                        else if (finalG >= 9) label = "MINT";
                        else if (finalG >= 8) label = "NEAR MINT";
                        else if (finalG > 0) label = "EXCELLENT";

                        updatedCard.final_grade = finalG;
                        updatedCard.grade_label = label;
                    } else {
                        updatedCard.final_grade = 0;
                        updatedCard.grade_label = "Pending Assessment";
                    }
                }

                return updatedCard;
            })
        );
    };

    // Submit Handler -> Database Submissions & Card Registry
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cards.some((c) => !c.card_name.trim() || !c.set_name.trim())) {
            Swal.fire("Lengkapi Data Item", "Mohon isi Nama Item & Nama Set/Seri untuk semua item.", "warning");
            return;
        }

        setSaving(true);
        const randomOrderNo = `SUB-${Math.floor(100000 + Math.random() * 900000)}`;
        const repaymentVal = manualRepaymentInput !== "" ? Number(manualRepaymentInput) : 0;

        try {
            // 1. Insert ke Tabel Submissions
            const { data: subData, error: subErr } = await supabase
                .from("submissions")
                .insert({
                    order_no: randomOrderNo,
                    category_name: selectedCategory,
                    product_id: selectedProductId || null,
                    collector_name: collectorName,
                    phone_number: phoneNumber,
                    address,
                    total_cards: totalCardsCount,
                    subtotal: baseSubtotal,
                    shipping_cost: Number(shippingCost),
                    discount_amount: Number(discountAmount),
                    dp_amount: Number(dpAmount),
                    repayment_amount: repaymentVal,
                    total_price: grandTotal,
                    payment_status: paymentStatus,
                    status: "PENDING_RECEIPT",
                    courier_service: courierService,
                    assigned_grader_id: assignedGraderId || null,
                    created_at: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
                })
                .select("id")
                .single();

            if (subErr) throw subErr;

            // Catat Pemasukan Kas jika ada pembayaran masuk
            await syncSubmissionToCashFlow({
                orderNo: randomOrderNo,
                collectorName,
                paymentStatus,
                totalPrice: grandTotal,
                dpAmount: Number(dpAmount),
                date: orderDate || new Date().toISOString().split("T")[0],
            });

            // 2. Insert Setiap Item + collector_id + points ke Tabel card_registry
            if (subData && subData.id) {
                const cardRecords = cards.map((c) => {
                    const certNum = `ICS-TR-${Math.floor(100000 + Math.random() * 900000)}`;
                    return {
                        submission_id: subData.id,
                        collector_id: c.collector_id || null,
                        points: Number(c.points) || 0,
                        cert_number: certNum,
                        card_name: c.card_name,
                        set_name: c.set_name,
                        card_number: c.card_number || "-",
                        language: c.language || "Japanese",
                        tcg_type: c.tcg_type || dynamicSubTypeOptions[0] || "OTHER",
                        sub_centering: Number(c.sub_centering) || 0.0,
                        sub_corners: Number(c.sub_corners) || 0.0,
                        sub_edges: Number(c.sub_edges) || 0.0,
                        sub_surface: Number(c.sub_surface) || 0.0,
                        final_grade: Number(c.final_grade) || 0.0,
                        grade_label: c.grade_label || "Pending Assessment",
                        grader_notes: c.grader_notes || null,
                        front_image_url: c.front_image_url || "-",
                        back_image_url: c.back_image_url || "-",
                        nfc_uid: c.nfc_uid || null,
                        is_encapsulated: true,
                        is_frozen: false,
                    };
                });

                const { error: cardErr } = await supabase.from("card_registry").insert(cardRecords);
                if (cardErr) throw cardErr;
            }

            Swal.fire(
                "Pesanan Berhasil Dibuat!",
                `Order No: ${randomOrderNo} dengan ${cards.length} item terdaftar.`,
                "success"
            );
            router.push("/admin/submissions");
        } catch (err: any) {
            Swal.fire("Gagal Menyimpan!", err.message || "Terjadi kesalahan database.", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 text-xs">
            {/* Top Header */}
            <div className="flex items-center gap-3">
                <Link
                    href="/admin/submissions"
                    className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Buat Pesanan Baru</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                        Isi formulir pemesanan dan tautkan item koleksi ke akun kolektor.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* BAGIAN 1: Informasi Pemesan */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <User className="w-4 h-4 text-brand-600" />
                        1. Informasi Pemesan
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-1">
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Nama Pemesan *
                            </label>
                            <input
                                type="text"
                                required
                                value={collectorName}
                                onChange={(e) => setCollectorName(e.target.value)}
                                placeholder="Nama Pemesan / Pengirim..."
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Tanggal Order *
                            </label>
                            <input
                                type="date"
                                required
                                value={orderDate}
                                onChange={(e) => setOrderDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                No. WhatsApp *
                            </label>
                            <input
                                type="tel"
                                required
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="0812..."
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Dikerjakan Oleh
                            </label>
                            <select
                                value={assignedGraderId}
                                onChange={(e) => setAssignedGraderId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium cursor-pointer focus:outline-none focus:border-brand-500"
                            >
                                <option value="">-- Belum Ditugaskan --</option>
                                {staffList.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.username || s.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Alamat Pengiriman
                            </label>
                            <textarea
                                rows={2}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Alamat tujuan pengiriman..."
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-brand-500"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Tipe / Kurir Pengiriman *
                            </label>
                            <select
                                value={courierService}
                                onChange={(e) => setCourierService(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium cursor-pointer focus:outline-none focus:border-brand-500"
                            >
                                <option value="JNE">JNE Express</option>
                                <option value="SiCepat">SiCepat</option>
                                <option value="J&T">J&amp;T Express</option>
                                <option value="Paxel">Paxel</option>
                                <option value="Drop-off Lab">Drop-off / Ambil di Lab</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* BAGIAN 2: Pilihan Produk */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className="w-4 h-4 text-brand-600" />
                        2. Pilihan Produk Layanan
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Kategori Layanan *
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold cursor-pointer focus:outline-none focus:border-brand-500"
                            >
                                {categories.map((c) => (
                                    <option key={c.id} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Pilih Produk Grading *
                            </label>
                            <select
                                required
                                value={selectedProductId}
                                onChange={(e) => handleProductSelect(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold cursor-pointer focus:outline-none focus:border-brand-500"
                            >
                                <option value="">-- Pilih Produk Layanan --</option>
                                {availableProducts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} - Rp {p.price.toLocaleString("id-ID")}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Order Lewat *
                            </label>
                            <select
                                value={orderChannel}
                                onChange={(e) => setOrderChannel(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium cursor-pointer focus:outline-none focus:border-brand-500"
                            >
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Website">Website Direct</option>
                                <option value="Tokopedia">Tokopedia / Shopee</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* BAGIAN 3: Rincian Pembayaran */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-brand-600" />
                        3. Rincian Pembayaran
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Harga Produk (Otomatis)
                            </label>
                            <input
                                type="number"
                                readOnly
                                value={productUnitPrice}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 font-bold text-brand-600 dark:text-brand-400 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Ongkir (Rp)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={shippingCost}
                                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Diskon (Rp)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={discountAmount}
                                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold text-rose-600 dark:text-rose-400 focus:outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Bayar DP (Rp)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={dpAmount}
                                onChange={(e) => setDpAmount(parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                Pelunasan (Sisa Rp)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={manualRepaymentInput}
                                onChange={(e) =>
                                    setManualRepaymentInput(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                                }
                                placeholder={`Tagihan Sisa: Rp ${autoRemainingPayment.toLocaleString("id-ID")}`}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-gray-100 dark:border-gray-800 font-bold">
                        <div className="text-gray-800 dark:text-gray-200">
                            Total Harga ({cards.length} Item):{" "}
                            <span className="text-base text-gray-900 dark:text-white font-black ml-1">
                                Rp {grandTotal.toLocaleString("id-ID")}
                            </span>
                        </div>

                        <div className="text-right">
                            {finalRemainingPayment === 0 && grandTotal > 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">LUNAS</span>
                            ) : (
                                <span className="text-rose-600 dark:text-rose-400 font-black text-sm">
                                    Sisa: Rp {finalRemainingPayment.toLocaleString("id-ID")} (BELUM LUNAS)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* BAGIAN 4: Data Isian & Penilaian Item Koleksi (Card Registry) */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Layers className="w-4 h-4 text-brand-600" />
                            4. Data Isian &amp; Penilaian Item Koleksi (Card Registry)
                        </h2>

                        <button
                            type="button"
                            onClick={handleAddCardRow}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Item
                        </button>
                    </div>

                    <div className="space-y-6">
                        {cards.map((card, idx) => (
                            <div
                                key={card.tempId}
                                className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/20 dark:bg-gray-800/40 space-y-4"
                            >
                                {/* Header Item & Status Result */}
                                <div className="flex items-center justify-between border-b border-purple-100 dark:border-gray-700 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                                            Item #{idx + 1}
                                        </span>
                                        {cards.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCardRow(card.tempId)}
                                                className="text-rose-600 hover:text-rose-700 dark:text-rose-400 p-1 cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="text-right bg-purple-100/70 dark:bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
                                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block uppercase">
                                            Calculated Grade
                                        </span>
                                        <span className="text-sm font-black text-purple-800 dark:text-purple-200">
                                            {card.final_grade} - {card.grade_label}
                                        </span>
                                    </div>
                                </div>

                                {/* Pilihan Akun Kolektor & Input Manual Poin */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            Akun Kolektor Pemilik Item (Registry &amp; Leaderboard)
                                        </label>
                                        <CollectorSelectDropdown
                                            collectors={collectorsList}
                                            value={card.collector_id}
                                            onChange={(colId) => handleCardChange(card.tempId, "collector_id", colId)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            Poin Item (Pts)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={card.points}
                                            onChange={(e) =>
                                                handleCardChange(card.tempId, "points", parseInt(e.target.value) || 0)
                                            }
                                            placeholder="0"
                                            className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 font-black focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>

                                {/* Info Identitas Item */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            Nama Kartu / Item *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={card.card_name}
                                            onChange={(e) => handleCardChange(card.tempId, "card_name", e.target.value)}
                                            placeholder="e.g. Charizard 1st Edition / Funko Luffy"
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            Nama Set / Seri *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={card.set_name}
                                            onChange={(e) => handleCardChange(card.tempId, "set_name", e.target.value)}
                                            placeholder="e.g. Base Set (1999) / One Piece Line"
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            Nomor Kartu / Seri
                                        </label>
                                        <input
                                            type="text"
                                            value={card.card_number}
                                            onChange={(e) => handleCardChange(card.tempId, "card_number", e.target.value)}
                                            placeholder="e.g. #4/102"
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            Bahasa / Edisi
                                        </label>
                                        <select
                                            value={card.language}
                                            onChange={(e) => handleCardChange(card.tempId, "language", e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium cursor-pointer focus:outline-none focus:border-brand-500"
                                        >
                                            <option value="Japanese">Japanese</option>
                                            <option value="English">English</option>
                                            <option value="Indonesian">Indonesian</option>
                                            <option value="Korean">Korean</option>
                                            <option value="Chinese">Chinese</option>
                                            <option value="International">International / Global</option>
                                        </select>
                                    </div>

                                    {/* Dropdown Dinamis dari kolom sub_types di product_categories */}
                                    <div>
                                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            Tipe / Sub-Kategori ({selectedCategory || "Item"})
                                        </label>
                                        <select
                                            value={card.tcg_type}
                                            onChange={(e) => handleCardChange(card.tempId, "tcg_type", e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium cursor-pointer focus:outline-none focus:border-brand-500"
                                        >
                                            {dynamicSubTypeOptions.map((subCode) => (
                                                <option key={subCode} value={subCode}>
                                                    {subCode.replace(/_/g, " ")}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Input 4 Sub-Grades (Skala 1 - 10) */}
                                <div className="pt-2 border-t border-purple-100 dark:border-gray-700">
                                    <label className="block font-bold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-1.5">
                                        <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        Penilaian 4 Sub-Grades (Skala 1 - 10)
                                    </label>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                                Centering
                                            </label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="10"
                                                value={card.sub_centering}
                                                onChange={(e) =>
                                                    handleCardChange(card.tempId, "sub_centering", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 font-black text-center text-sm text-purple-900 dark:text-purple-300 focus:outline-none focus:border-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                                Corners
                                            </label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="10"
                                                value={card.sub_corners}
                                                onChange={(e) =>
                                                    handleCardChange(card.tempId, "sub_corners", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 font-black text-center text-sm text-purple-900 dark:text-purple-300 focus:outline-none focus:border-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                                Edges
                                            </label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="10"
                                                value={card.sub_edges}
                                                onChange={(e) =>
                                                    handleCardChange(card.tempId, "sub_edges", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 font-black text-center text-sm text-purple-900 dark:text-purple-300 focus:outline-none focus:border-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                                Surface
                                            </label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="10"
                                                value={card.sub_surface}
                                                onChange={(e) =>
                                                    handleCardChange(card.tempId, "sub_surface", parseFloat(e.target.value) || 0)
                                                }
                                                className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 font-black text-center text-sm text-purple-900 dark:text-purple-300 focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Input Foto Forensik & NFC UID */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            Foto Depan
                                        </label>
                                        <input
                                            type="text"
                                            value={card.front_image_url}
                                            onChange={(e) => handleCardChange(card.tempId, "front_image_url", e.target.value)}
                                            placeholder="https://..."
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            Foto Belakang
                                        </label>
                                        <input
                                            type="text"
                                            value={card.back_image_url}
                                            onChange={(e) => handleCardChange(card.tempId, "back_image_url", e.target.value)}
                                            placeholder="https://..."
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            NFC Chip UID
                                        </label>
                                        <input
                                            type="text"
                                            value={card.nfc_uid}
                                            onChange={(e) => handleCardChange(card.tempId, "nfc_uid", e.target.value)}
                                            placeholder="e.g. 04:A1:B2:C3:D4:E5:F6"
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-brand-500"
                                        />
                                    </div>
                                </div>

                                {/* Catatan Forensik Grader */}
                                <div>
                                    <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                        Catatan Forensik Grader (grader_notes)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={card.grader_notes}
                                        onChange={(e) => handleCardChange(card.tempId, "grader_notes", e.target.value)}
                                        placeholder="Catatan inspeksi mikroskopis (foil wear, print line, centering shift)..."
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons Footer */}
                <div className="flex items-center justify-end gap-3">
                    <Link
                        href="/admin/submissions"
                        className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                        Batal
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold cursor-pointer disabled:opacity-50 shadow-md transition-all"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Menyimpan..." : "Simpan Pesanan & Hasil Grade"}
                    </button>
                </div>
            </form>
        </div>
    );
}