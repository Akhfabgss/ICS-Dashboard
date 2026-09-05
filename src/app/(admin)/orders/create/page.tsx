"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
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

// 1. URUTAN DATA ISIAN DESIGN SESUAI KETENTUAN
const DEFAULT_DESIGN_FIELDS = [
    { key: "Nama dalam Design", value: "" },
    { key: "Nama Lokasi", value: "" },
    { key: "Via / Jalur", value: "" },
    { key: "Ketinggian / Jarak", value: "" },
    { key: "Tanggal", value: "" },
    { key: "Quotes", value: "" },
    { key: "Link Foto (Drive)", value: "" },
    { key: "Catatan", value: "" },
];

export default function CreateOrderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [productList, setProductList] = useState<ProductOption[]>([]);
    const [addonList, setAddonList] = useState<AddonOption[]>([]);
    const [staffList, setStaffList] = useState<UserProfile[]>([]);

    // Form States
    const [customerName, setCustomerName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [category, setCategory] = useState("PENDAKIAN");
    const [productName, setProductName] = useState("");
    const [isCustomProduct, setIsCustomProduct] = useState(false);
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
    const [notes, setNotes] = useState("");

    useEffect(() => {
        const fetchMasterData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
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

            const [prodRes, addRes, staffRes] = await Promise.all([
                supabase.from("products").select("id, name, price").order("name"),
                supabase.from("add_ons").select("id, name, price").order("name"),
                supabase.from("profiles")
                    .select("id, full_name, email, role")
                    .order("full_name"),
            ]);

            if (prodRes.data && prodRes.data.length > 0) {
                setProductList(prodRes.data);
                setProductName(prodRes.data[0].name);
                setFramePrice(Number(prodRes.data[0].price || 0));
            }
            if (addRes.data) setAddonList(addRes.data);
            if (staffRes.data) setStaffList(staffRes.data as UserProfile[]);
        };

        fetchMasterData();
    }, []);

    const normalizedRole = (userRole || "").toLowerCase().trim();
    const isFinanceVisible = normalizedRole !== "staff" && normalizedRole !== "designer" && normalizedRole !== "";

    const handleProductSelect = (selectedName: string) => {
        if (selectedName === "CUSTOM_NEW") {
            setIsCustomProduct(true);
            setProductName("");
            setFramePrice(0);
            return;
        }
        setIsCustomProduct(false);
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
            prev.includes(addonName) ? prev.filter((a) => a !== addonName) : [...prev, addonName]
        );
    };

    // Kalkulasi Total Harga Add-ons
    const standardAddonsPrice = selectedAddons.reduce((acc, name) => {
        const item = addonList.find((a) => a.name === name);
        return acc + (item ? Number(item.price) : 0);
    }, 0);

    const extraPhotoPrice = isExtraPhotoChecked ? extraPhotoCount * 5000 : 0;
    const addonsPrice = standardAddonsPrice + extraPhotoPrice;

    // Kalkulasi Keuangan
    const subtotal = framePrice + addonsPrice + shippingFee;
    const totalPrice = Math.max(0, subtotal - discountAmount);
    const remainingPayment = totalPrice - (dpAmount + repaymentAmount);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!productName.trim()) {
            Swal.fire("Peringatan", "Nama produk frame wajib diisi!", "warning");
            return;
        }

        const result = await Swal.fire({
            title: "Simpan Pesanan Baru?",
            text: "Apakah kamu yakin data yang diisi sudah benar?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#aaa",
            confirmButtonText: "Ya, Simpan!",
            cancelButtonText: "Periksa Lagi",
        });
        if (!result.isConfirmed) return;

        setLoading(true);
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

        if (isCustomProduct || !productList.some((p) => p.name.toLowerCase() === productName.trim().toLowerCase())) {
            const { data: newProd } = await supabase
                .from("products")
                .insert([{ name: productName.trim(), price: framePrice }])
                .select()
                .single();

            if (newProd) {
                setProductList((prev) => [...prev, newProd]);
            }
        }

        const finalAddons = [...selectedAddons];
        if (isExtraPhotoChecked) {
            finalAddons.push(`Tambah foto (${extraPhotoCount} Foto)`);
        }

        const payload: Record<string, unknown> = {
            order_number: orderNumber,
            customer_name: customerName.trim(),
            phone_number: phoneNumber.trim(),
            address,
            category,
            product_name: productName.trim(),
            order_source: orderSource,
            add_ons: finalAddons,
            assigned_to: assignedTo || null,
            design_data: JSON.stringify(designFields),
            shipping_method: shippingMethod,
            notes,
            status: "Dalam Daftar", // DIBUAT DEFAULT "Dalam Daftar"
        };

        if (isFinanceVisible) {
            payload.frame_price = framePrice;
            payload.addons_price = addonsPrice;
            payload.shipping_fee = shippingFee;
            payload.discount_amount = discountAmount;
            payload.dp_amount = dpAmount;
            payload.repayment_amount = repaymentAmount;
        }

        const { error } = await supabase.from("orders").insert([payload]);
        setLoading(false);

        if (error) {
            Swal.fire("Error", "Gagal menyimpan pesanan: " + error.message, "error");
        } else {
            Swal.fire("Berhasil!", "Pesanan baru telah berhasil ditambahkan.", "success");
            router.push("/orders");
        }
    };

    return (
        <div className="mx-auto space-y-6 pb-12 p-4 sm:p-6">
            {/* HEADER */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Buat Pesanan Baru</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Isi formulir lengkap pemesanan produk Framelo.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. DATA PEMESAN */}
                <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">1. Informasi Pemesan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block font-medium mb-1">Nama Pemesan *</label>
                            <input
                                type="text"
                                required
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 outline-none focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block font-medium mb-1">No. WhatsApp *</label>
                            <input
                                type="text"
                                required
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 outline-none focus:border-brand-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block font-medium mb-1">Alamat Pengiriman</label>
                            <textarea
                                rows={2}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 outline-none focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Tipe / Kurir Pengiriman *</label>
                            <select
                                value={shippingMethod}
                                onChange={(e) => setShippingMethod(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-900 outline-none focus:border-brand-500 font-medium cursor-pointer"
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
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">2. Pilihan Produk &amp; Add-ons</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <label className="block font-medium mb-1">Kategori Desain *</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-900 outline-none focus:border-brand-500 font-medium cursor-pointer"
                            >
                                <option value="PENDAKIAN">PENDAKIAN (P)</option>
                                <option value="RUNNING">RUNNING (R)</option>
                                <option value="SEPEDA">SEPEDA (S)</option>
                                <option value="TOURING">TOURING (T)</option>
                                <option value="CUSTOM">CUSTOM (C)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Pilih Produk Frame *</label>
                            {!isCustomProduct ? (
                                <select
                                    value={productName}
                                    onChange={(e) => handleProductSelect(e.target.value)}
                                    className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-900 outline-none focus:border-brand-500 font-medium cursor-pointer"
                                >
                                    {productList.map((p) => (
                                        <option key={p.id} value={p.name}>
                                            {p.name} {isFinanceVisible ? `(Rp ${p.price.toLocaleString("id-ID")})` : ""}
                                        </option>
                                    ))}
                                    <option value="CUSTOM_NEW">+ Tambah Produk Frame Baru</option>
                                </select>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nama frame baru..."
                                        value={productName}
                                        onChange={(e) => setProductName(e.target.value)}
                                        className="flex-1 rounded-xl border p-2.5 bg-transparent dark:border-gray-700 outline-none focus:border-brand-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomProduct(false)}
                                        className="px-3 py-1 rounded-xl border text-xs hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block font-medium mb-1">Order Lewat *</label>
                            <select
                                value={orderSource}
                                onChange={(e) => setOrderSource(e.target.value)}
                                className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-900 outline-none focus:border-brand-500 cursor-pointer"
                            >
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Shopee">Shopee</option>
                                <option value="Tokopedia">Tokopedia</option>
                                <option value="TikTok Shop">TikTok Shop</option>
                            </select>
                        </div>
                    </div>

                    {/* ADD-ONS SECTION */}
                    <div>
                        <label className="block font-medium mb-2 text-sm">Pilih Tambahan / Add-ons</label>
                        {addonList.length === 0 ? (
                            <p className="text-sm text-gray-400">Belum ada item add-on di database.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {addonList.map((item) => {
                                    const isPhotoAddon = item.name.toLowerCase().includes("foto");

                                    if (isPhotoAddon) {
                                        return (
                                            <div
                                                key={item.id}
                                                className={`p-3 rounded-xl border transition-colors ${isExtraPhotoChecked
                                                        ? "border-brand-500 bg-brand-50/20 dark:bg-brand-500/10"
                                                        : "border-gray-200 dark:border-gray-800"
                                                    }`}
                                            >
                                                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium">
                                                    <input
                                                        type="checkbox"
                                                        checked={isExtraPhotoChecked}
                                                        onChange={() => setIsExtraPhotoChecked(!isExtraPhotoChecked)}
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
                                                            onChange={(e) => setExtraPhotoCount(Math.max(1, Number(e.target.value)))}
                                                            className="w-20 rounded-lg border px-2 py-1 text-xs bg-white dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-brand-500 font-bold"
                                                        />
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            foto {isFinanceVisible && ` (+Rp ${extraPhotoPrice.toLocaleString("id-ID")})`}
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
                                                    ? "border-brand-500 bg-brand-50/20 dark:bg-brand-500/10 font-medium"
                                                    : "border-gray-200 dark:border-gray-800"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAddons.includes(item.name)}
                                                onChange={() => toggleAddon(item.name)}
                                                className="rounded text-brand-500 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                                            />
                                            <span>
                                                {item.name} {isFinanceVisible ? `(+Rp ${item.price.toLocaleString("id-ID")})` : ""}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. RINCIAN KEUANGAN */}
                {isFinanceVisible && (
                    <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
                        <h3 className="font-bold text-gray-800 dark:text-white text-base">3. Rincian Pembayaran</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <label className="block font-medium mb-1">Harga Frame (Rp)</label>
                                <input
                                    type="number"
                                    value={framePrice}
                                    onChange={(e) => setFramePrice(Number(e.target.value))}
                                    className="w-full rounded-xl border p-2.5 bg-transparent font-bold text-brand-600 dark:text-brand-400 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Ongkir (Rp)</label>
                                <input
                                    type="number"
                                    value={shippingFee}
                                    onChange={(e) => setShippingFee(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Diskon (Rp)</label>
                                <input
                                    type="number"
                                    value={discountAmount}
                                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700 text-rose-500 font-semibold"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2">
                            <div>
                                <label className="block font-medium mb-1">Bayar DP (Rp)</label>
                                <input
                                    type="number"
                                    value={dpAmount}
                                    onChange={(e) => setDpAmount(Number(e.target.value))}
                                    className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Pelunasan (Rp)</label>
                                <input
                                    type="number"
                                    value={repaymentAmount}
                                    onChange={(e) => setRepaymentAmount(Number(e.target.value))}
                                    className="w-full rounded-xl border p-2.5 bg-transparent dark:border-gray-700"
                                />
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 flex justify-between text-sm font-semibold">
                            <span>
                                Total Harga: Rp {totalPrice.toLocaleString("id-ID")}
                                {discountAmount > 0 && ` (Potongan Rp ${discountAmount.toLocaleString("id-ID")})`}
                            </span>
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
                        <button
                            type="button"
                            onClick={() => setDesignFields([...designFields, { key: "", value: "" }])}
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
                                    className="w-1/3 rounded-xl border p-2 text-sm bg-transparent dark:border-gray-700 font-semibold"
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
                                    className="flex-1 rounded-xl border p-2 text-sm bg-transparent dark:border-gray-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => setDesignFields(designFields.filter((_, i) => i !== index))}
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
                        className="px-6 py-3 rounded-xl border dark:border-gray-700 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        {loading ? "Menyimpan..." : "Simpan Pesanan"}
                    </button>
                </div>
            </form>
        </div>
    );
}