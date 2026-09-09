"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Swal from "sweetalert2";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
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

interface MutationItem {
    item_name: string;
    category: string;
    stock_in: number;
    stock_out: number;
    notes: string;
}

// URUTAN DATA ISIAN DESIGN SESUAI KETENTUAN
const DEFAULT_DESIGN_FIELDS = [
    { key: "Nama dalam Design", value: "" },
    { key: "Nama Lokasi", value: "" },
    { key: "Via / Jalur", value: "" },
    { key: "Ketinggian / Jarak", value: "" },
    { key: "Tanggal", value: "" },
    { key: "Durasi", value: "" },
    { key: "Quotes", value: "" },
    { key: "Link Foto (Drive)", value: "" },
    { key: "Catatan", value: "" },
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
    const [orderDate, setOrderDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );
    const [customerName, setCustomerName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [category, setCategory] = useState("PENDAKIAN");
    const [productName, setProductName] = useState("");
    const [orderSource, setOrderSource] = useState("WhatsApp");
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [assignedTo, setAssignedTo] = useState("");

    // Custom Add-on State untuk Tambah Foto
    const [isExtraPhotoChecked, setIsExtraPhotoChecked] = useState(false);
    const [extraPhotoCount, setExtraPhotoCount] = useState<number>(1);

    const [framePrice, setFramePrice] = useState<number>(0);
    const [shippingFee, setShippingFee] = useState<number>(0);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [dpAmount, setDpAmount] = useState<number>(0);
    const [repaymentAmount, setRepaymentAmount] = useState<number>(0);

    const [designFields, setDesignFields] = useState(DEFAULT_DESIGN_FIELDS);
    const [shippingMethod, setShippingMethod] = useState("JNE");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", session.user.id)
                    .single();
                if (profile?.role) {
                    setUserRole(String(profile.role).toLowerCase().trim());
                }
            }

            const [prodRes, addRes, orderRes, staffRes] = await Promise.all([
                supabase.from("products").select("id, name, price").order("name"),
                supabase.from("add_ons").select("id, name, price").order("name"),
                supabase.from("orders").select("*").eq("id", orderId).single(),
                supabase
                    .from("profiles")
                    .select("id, full_name, email, role")
                    .order("full_name"),
            ]);

            if (prodRes.data) setProductList(prodRes.data);
            if (addRes.data) setAddonList(addRes.data);

            if (staffRes.data) {
                const onlyStaff = (staffRes.data as UserProfile[]).filter((s) => {
                    const r = String(s.role || "").toLowerCase().trim();
                    return r === "staff" || r === "designer";
                });
                setStaffList(onlyStaff);
            }

            if (orderRes.data) {
                const o = orderRes.data;
                setOrderNumber(o.order_number || "");

                // Fetch order_date (fallback ke created_at jika null)
                const initialDate = o.order_date
                    ? o.order_date
                    : o.created_at
                        ? new Date(o.created_at).toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0];
                setOrderDate(initialDate);

                setCustomerName(o.customer_name || "");
                setPhoneNumber(o.phone_number || "");
                setAddress(o.address || "");
                setCategory(o.category || "PENDAKIAN");
                setProductName(o.product_name || "");
                setOrderSource(o.order_source || "WhatsApp");
                setAssignedTo(o.assigned_to || "");
                setFramePrice(Number(o.frame_price || 0));
                setShippingFee(Number(o.shipping_fee || 0));
                setDiscountAmount(Number(o.discount_amount || 0));
                setDpAmount(Number(o.dp_amount || 0));
                setRepaymentAmount(Number(o.repayment_amount || 0));
                setShippingMethod(o.shipping_method || "JNE");

                // Parsing Add-ons & Deteksi Tambah Foto
                const rawAddons: string[] = o.add_ons || [];
                const normalAddons: string[] = [];
                let photoFound = false;

                rawAddons.forEach((addonStr) => {
                    if (addonStr.toLowerCase().includes("tambah foto")) {
                        photoFound = true;
                        const match = addonStr.match(/\((\d+)\s*Foto\)/i);
                        if (match && match[1]) {
                            setExtraPhotoCount(parseInt(match[1], 10));
                        } else {
                            setExtraPhotoCount(1);
                        }
                    } else {
                        normalAddons.push(addonStr);
                    }
                });

                setIsExtraPhotoChecked(photoFound);
                setSelectedAddons(normalAddons);

                if (o.design_data) {
                    try {
                        const parsed = JSON.parse(o.design_data);
                        if (Array.isArray(parsed) && parsed.length > 0)
                            setDesignFields(parsed);
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
    const isFinanceVisible =
        normalizedRole !== "staff" &&
        normalizedRole !== "designer" &&
        normalizedRole !== "";

    const handleProductSelect = (selectedName: string) => {
        setProductName(selectedName);
        const found = productList.find((p) => p.name === selectedName);
        if (found) setFramePrice(Number(found.price || 0));
    };

    const toggleAddon = (addonName: string) => {
        if (addonName.toLowerCase().includes("foto")) {
            setIsExtraPhotoChecked(!isExtraPhotoChecked);
            return;
        }

        setSelectedAddons((prev) =>
            prev.includes(addonName)
                ? prev.filter((a) => a !== addonName)
                : [...prev, addonName]
        );
    };

    const standardAddonsPrice = selectedAddons.reduce((acc, name) => {
        const item = addonList.find((a) => a.name === name);
        return acc + (item ? Number(item.price) : 0);
    }, 0);

    const extraPhotoPrice = isExtraPhotoChecked ? extraPhotoCount * 5000 : 0;
    const addonsPrice = standardAddonsPrice + extraPhotoPrice;

    const subtotal = framePrice + addonsPrice + shippingFee;
    const totalPrice = Math.max(0, subtotal - discountAmount);
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

        const finalAddons = [...selectedAddons];
        if (isExtraPhotoChecked) {
            finalAddons.push(`Tambah foto (${extraPhotoCount} Foto)`);
        }

        const { data: oldOrder } = await supabase
            .from("orders")
            .select("product_name, status")
            .eq("id", orderId)
            .single();

        const basePayload: Record<string, unknown> = {
            order_date: orderDate,
            customer_name: customerName.trim(),
            phone_number: phoneNumber.trim(),
            address,
            category,
            product_name: productName,
            order_source: orderSource,
            add_ons: finalAddons,
            assigned_to: assignedTo || null,
            design_data: JSON.stringify(designFields),
            shipping_method: shippingMethod,
        };

        if (isFinanceVisible) {
            basePayload.frame_price = framePrice;
            basePayload.addons_price = addonsPrice;
            basePayload.shipping_fee = shippingFee;
            basePayload.discount_amount = discountAmount;
            basePayload.dp_amount = dpAmount;
            basePayload.repayment_amount = repaymentAmount;
        }

        const { error } = await supabase
            .from("orders")
            .update(basePayload)
            .eq("id", orderId);

        if (error) {
            setSubmitting(false);
            Swal.fire(
                "Error",
                "Gagal memperbarui pesanan: " + error.message,
                "error"
            );
            return;
        }

        if (
            oldOrder &&
            (oldOrder.status === "Selesai" || oldOrder.status === "Done") &&
            oldOrder.product_name.trim().toLowerCase() !==
            productName.trim().toLowerCase()
        ) {
            try {
                const { data: oldProd } = await supabase
                    .from("products")
                    .select("id")
                    .ilike("name", oldOrder.product_name.trim())
                    .maybeSingle();

                if (oldProd) {
                    const { data: oldRecipes } = await supabase
                        .from("product_recipes")
                        .select("inventory_id, quantity_required")
                        .eq("product_id", oldProd.id);

                    if (oldRecipes && oldRecipes.length > 0) {
                        const invIds = oldRecipes.map((r) => r.inventory_id);
                        const { data: invItems } = await supabase
                            .from("inventory")
                            .select("id, item_name")
                            .in("id", invIds);

                        const invMap = new Map(
                            invItems?.map((i) => [i.id, i.item_name])
                        );
                        const rollbackMutations: MutationItem[] = [];

                        oldRecipes.forEach((r) => {
                            const itemName = invMap.get(r.inventory_id);
                            if (itemName) {
                                rollbackMutations.push({
                                    item_name: itemName.trim(),
                                    category: "Adjustment",
                                    stock_in: Number(r.quantity_required || 1),
                                    stock_out: 0,
                                    notes: `Rollback stok karena Edit Order #${orderNumber} (${oldOrder.product_name} -> ${productName})`,
                                });
                            }
                        });

                        if (rollbackMutations.length > 0) {
                            await supabase
                                .from("inventory")
                                .insert(rollbackMutations);
                        }
                    }
                }

                const { data: newProd } = await supabase
                    .from("products")
                    .select("id")
                    .ilike("name", productName.trim())
                    .maybeSingle();

                if (newProd) {
                    const { data: newRecipes } = await supabase
                        .from("product_recipes")
                        .select("inventory_id, quantity_required")
                        .eq("product_id", newProd.id);

                    if (newRecipes && newRecipes.length > 0) {
                        const invIds = newRecipes.map((r) => r.inventory_id);
                        const { data: invItems } = await supabase
                            .from("inventory")
                            .select("id, item_name")
                            .in("id", invIds);

                        const invMap = new Map(
                            invItems?.map((i) => [i.id, i.item_name])
                        );
                        const deductMutations: MutationItem[] = [];

                        newRecipes.forEach((r) => {
                            const itemName = invMap.get(r.inventory_id);
                            if (itemName) {
                                deductMutations.push({
                                    item_name: itemName.trim(),
                                    category: "Penjualan",
                                    stock_in: 0,
                                    stock_out: Number(r.quantity_required || 1),
                                    notes: `Pemotongan resep produk baru dari Edit Order #${orderNumber}`,
                                });
                            }
                        });

                        if (deductMutations.length > 0) {
                            await supabase
                                .from("inventory")
                                .insert(deductMutations);
                        }
                    }
                }
            } catch (stkErr) {
                console.error("Gagal menyesuaikan stok otomatis:", stkErr);
            }
        }

        setSubmitting(false);
        Swal.fire(
            "Berhasil!",
            "Data pesanan berhasil diperbarui.",
            "success"
        );
        router.push("/orders");
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Memuat data pesanan...
            </div>
        );
    }

    return (
        <div className="mx-auto space-y-6 pb-12 p-4 sm:p-6 text-gray-900 dark:text-gray-100">
            {/* HEADER */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Edit Pesanan ({orderNumber})
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Perbarui data pesanan produk dan rincian transaksi.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. DATA PEMESAN */}
                <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">
                        1. Informasi Pemesan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                            <label className="block font-medium mb-1 dark:text-gray-200">
                                Nama Pemesan *
                            </label>
                            <input
                                type="text"
                                required
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-2.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block font-medium mb-1 dark:text-gray-200">
                                Tanggal Order *
                            </label>
                            <div className="relative w-full">
                                <input
                                    type="date"
                                    required
                                    value={orderDate}
                                    onChange={(e) => setOrderDate(e.target.value)}
                                    onClick={(e) =>
                                        (e.target as HTMLInputElement).showPicker?.()
                                    }
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-2.5 text-gray-900 dark:text-white outline-none focus:border-brand-500 font-medium cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-medium mb-1 dark:text-gray-200">
                                No. WhatsApp *
                            </label>
                            <input
                                type="text"
                                required
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-2.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block font-medium mb-1 dark:text-gray-200">
                                Dikerjakan Oleh
                            </label>
                            <select
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 p-2.5 text-gray-900 dark:text-white outline-none focus:border-brand-500 cursor-pointer"
                            >
                                <option value="">— Belum Ditugaskan —</option>
                                {staffList.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.full_name || s.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block font-medium mb-1 dark:text-gray-200">
                                Alamat Pengiriman
                            </label>
                            <textarea
                                rows={2}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-2.5 text-gray-900 dark:text-white outline-none focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block font-medium mb-1 dark:text-gray-200">
                                Tipe / Kurir Pengiriman *
                            </label>
                            <select
                                value={shippingMethod}
                                onChange={(e) => setShippingMethod(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 p-2.5 text-gray-900 dark:text-white outline-none focus:border-brand-500 font-medium cursor-pointer"
                            >
                                <option value="JNE">JNE</option>
                                <option value="J&T">J&amp;T Express</option>
                                <option value="SPX">SPX (Shopee Express)</option>
                                <option value="Lion Parcel">Lion Parcel</option>
                                <option value="Di Tempat">Di Tempat (Ambil di Toko)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. PRODUK & ADD-ONS */}
                <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">
                        2. Pilihan Produk &amp; Add-ons
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <label className="block font-medium mb-1 dark:text-gray-200">
                                Kategori Desain *
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 p-2.5 text-gray-900 dark:text-white outline-none focus:border-brand-500 font-medium cursor-pointer"
                            >
                                <option value="PENDAKIAN">PENDAKIAN (P)</option>
                                <option value="RUNNING">RUNNING (R)</option>
                                <option value="SEPEDA">SEPEDA (S)</option>
                                <option value="TOURING">TOURING (T)</option>
                                <option value="CUSTOM">CUSTOM (C)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-medium mb-1 dark:text-gray-200">
                                Pilih Produk Frame *
                            </label>
                            <select
                                value={productName}
                                onChange={(e) => handleProductSelect(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 p-2.5 text-gray-900 dark:text-white outline-none focus:border-brand-500 font-medium cursor-pointer"
                            >
                                {productList.map((p) => (
                                    <option key={p.id} value={p.name}>
                                        {p.name}{" "}
                                        {isFinanceVisible
                                            ? `(Rp ${p.price.toLocaleString("id-ID")})`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block font-medium mb-1 dark:text-gray-200">
                                Order Lewat *
                            </label>
                            <select
                                value={orderSource}
                                onChange={(e) => setOrderSource(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-gray-900 p-2.5 text-gray-900 dark:text-white outline-none focus:border-brand-500 cursor-pointer"
                            >
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Shopee">Shopee</option>
                                <option value="Tokopedia">Tokopedia</option>
                                <option value="TikTok Shop">TikTok Shop</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block font-medium mb-2 text-sm dark:text-gray-200">
                            Pilih Tambahan / Add-ons
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {addonList.map((item) => {
                                const isPhotoAddon = item.name
                                    .toLowerCase()
                                    .includes("foto");

                                if (isPhotoAddon) {
                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-3 rounded-xl border transition-colors ${isExtraPhotoChecked
                                                    ? "border-brand-500 bg-brand-50/20 dark:bg-brand-500/10"
                                                    : "border-gray-200 dark:border-gray-800"
                                                }`}
                                        >
                                            <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium dark:text-gray-200">
                                                <input
                                                    type="checkbox"
                                                    checked={isExtraPhotoChecked}
                                                    onChange={() =>
                                                        setIsExtraPhotoChecked(!isExtraPhotoChecked)
                                                    }
                                                    className="rounded text-brand-500 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                                                />
                                                <span>Tambah foto</span>
                                            </label>

                                            {isExtraPhotoChecked && (
                                                <div className="mt-2.5 pl-6 flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={extraPhotoCount}
                                                        onChange={(e) =>
                                                            setExtraPhotoCount(
                                                                Math.max(1, Number(e.target.value))
                                                            )
                                                        }
                                                        className="w-20 rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-brand-500 font-bold"
                                                    />
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        foto{" "}
                                                        {isFinanceVisible &&
                                                            ` (+Rp ${extraPhotoPrice.toLocaleString(
                                                                "id-ID"
                                                            )})`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <label
                                        key={item.id}
                                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-sm transition-colors ${selectedAddons.includes(item.name)
                                                ? "border-brand-500 bg-brand-50/20 dark:bg-brand-500/10 font-medium dark:text-white"
                                                : "border-gray-200 dark:border-gray-800 dark:text-gray-300"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedAddons.includes(item.name)}
                                            onChange={() => toggleAddon(item.name)}
                                            className="rounded text-brand-500 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                                        />
                                        <span>
                                            {item.name}{" "}
                                            {isFinanceVisible
                                                ? `(+Rp ${item.price.toLocaleString("id-ID")})`
                                                : ""}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 3. RINCIAN KEUANGAN */}
                {isFinanceVisible && (
                    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                        <h3 className="font-bold text-gray-800 dark:text-white text-base">
                            3. Rincian Pembayaran
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <label className="block font-medium mb-1 dark:text-gray-200">
                                    Harga Frame (Rp)
                                </label>
                                <input
                                    type="number"
                                    value={framePrice}
                                    onChange={(e) => setFramePrice(Number(e.target.value))}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent font-bold text-brand-600 dark:text-brand-400 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-1 dark:text-gray-200">
                                    Ongkir (Rp)
                                </label>
                                <input
                                    type="number"
                                    value={shippingFee}
                                    onChange={(e) => setShippingFee(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-gray-900 dark:text-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-1 dark:text-gray-200">
                                    Diskon (Rp)
                                </label>
                                <input
                                    type="number"
                                    value={discountAmount}
                                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-rose-500 font-semibold outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2">
                            <div>
                                <label className="block font-medium mb-1 dark:text-gray-200">
                                    Bayar DP (Rp)
                                </label>
                                <input
                                    type="number"
                                    value={dpAmount}
                                    onChange={(e) => setDpAmount(Number(e.target.value))}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-gray-900 dark:text-white outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-1 dark:text-gray-200">
                                    Pelunasan (Rp)
                                </label>
                                <input
                                    type="number"
                                    value={repaymentAmount}
                                    onChange={(e) => setRepaymentAmount(Number(e.target.value))}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-gray-900 dark:text-white outline-none"
                                />
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 flex justify-between text-sm font-semibold">
                            <span className="text-gray-800 dark:text-gray-200">
                                Total Harga: Rp {totalPrice.toLocaleString("id-ID")}
                                {discountAmount > 0 &&
                                    ` (Potongan Rp ${discountAmount.toLocaleString("id-ID")})`}
                            </span>
                            <span
                                className={
                                    remainingPayment <= 0
                                        ? "text-emerald-500 dark:text-emerald-400"
                                        : "text-rose-500 dark:text-rose-400"
                                }
                            >
                                Sisa: Rp {remainingPayment.toLocaleString("id-ID")}{" "}
                                ({remainingPayment <= 0 ? "LUNAS" : "BELUM LUNAS"})
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
                        <button
                            type="button"
                            onClick={() =>
                                setDesignFields([...designFields, { key: "", value: "" }])
                            }
                            className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> Tambah Poin Custom
                        </button>
                    </div>
                    <div className="space-y-2">
                        {designFields.map((field, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    placeholder="Nama Poin"
                                    value={field.key}
                                    onChange={(e) => {
                                        const u = [...designFields];
                                        u[index].key = e.target.value;
                                        setDesignFields(u);
                                    }}
                                    className="w-1/3 rounded-xl border border-gray-300 dark:border-gray-700 p-2 text-sm bg-transparent text-gray-900 dark:text-white font-semibold"
                                />
                                <input
                                    type="text"
                                    placeholder="Isi data..."
                                    value={field.value}
                                    onChange={(e) => {
                                        const u = [...designFields];
                                        u[index].value = e.target.value;
                                        setDesignFields(u);
                                    }}
                                    className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 p-2 text-sm bg-transparent text-gray-900 dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDesignFields(
                                            designFields.filter((_, i) => i !== index)
                                        )
                                    }
                                    className="p-2 text-rose-500 hover:text-rose-700 cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-700 font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        {submitting ? "Menyimpan..." : "Perbarui Pesanan"}
                    </button>
                </div>
            </form>
        </div>
    );
}