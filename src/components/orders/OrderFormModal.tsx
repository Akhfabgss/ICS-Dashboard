"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { Order } from "@/types/order";

interface ModalProps {
    isOpen: boolean;
    orderToEdit?: Order | null;
    onClose: () => void;
    onSuccess: () => void;
}

// 1. KATALOG PRODUK & HARGA AUTOMATIC (Berdasarkan PDF Pricelist Framelo)
const PRODUCT_CATALOG: Record<string, Record<string, number>> = {
    "Frame Tanpa Kaca": {
        "A5 (15x20cm)": 67000,
        "Kotak (20x20cm)": 97000,
        "A4 (20x30cm)": 137000,
    },
    "Frame Pakai Kaca": {
        "Kotak (20x20cm)": 157000,
        "A4 (20x30cm)": 217000,
    },
};

// 2. DATA TAMBAHAN / ADD-ONS
const ADDON_OPTIONS = [
    { name: "Cetak Foto Premium / Tambahan Foto", price: 15000 },
    { name: "Lampu LED Warm White Custom", price: 25000 },
    { name: "Greeting Card / Kartu Ucapan Custom", price: 5000 },
    { name: "Gift Box / Packaging Kado Eksklusif", price: 30000 },
    { name: "Extra Bubble Wrap Protection", price: 10000 },
];

// 3. PRESET POIN-POIN ISIAN DESAIN DEFAULT
const DEFAULT_DESIGN_FIELDS = [
    { key: "Nama Gunung / Lokasi", value: "" },
    { key: "Via / Jalur", value: "" },
    { key: "Nama Pemesan / Pendaki", value: "" },
    { key: "Tanggal", value: "" },
    { key: "Ketinggian / Jarak / Kedalaman", value: "" },
    { key: "Durasi", value: "" },
    { key: "Elevation Gain", value: "" },
    { key: "Quotes", value: "" },
    { key: "Link Foto (Drive/Cloud)", value: "" },
];

export default function OrderFormModal({ isOpen, orderToEdit, onClose, onSuccess }: ModalProps) {
    const [loading, setLoading] = useState(false);

    // State Input Pemesan
    const [customerName, setCustomerName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");

    // Dynamic Product Dropdown
    const [category, setCategory] = useState("Frame Tanpa Kaca");
    const [productName, setProductName] = useState("A5 (15x20cm)");

    const [orderSource, setOrderSource] = useState("WhatsApp");
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

    // Price State
    const [framePrice, setFramePrice] = useState<number>(67000);
    const [dpAmount, setDpAmount] = useState<number>(0);
    const [repaymentAmount, setRepaymentAmount] = useState<number>(0);

    // Dynamic Key-Value Pairs State (Data Desain Poin-Poin)
    const [designFields, setDesignFields] = useState<{ key: string; value: string }[]>(DEFAULT_DESIGN_FIELDS);

    const [shippingMethod, setShippingMethod] = useState("JNE");
    const [notes, setNotes] = useState("");

    // Populate data saat mode EDIT / Reset form saat mode TAMBAH
    useEffect(() => {
        if (orderToEdit) {
            setCustomerName(orderToEdit.customer_name || "");
            setPhoneNumber(orderToEdit.phone_number || "");
            setAddress(orderToEdit.address || "");
            setCategory(orderToEdit.category || "Frame Tanpa Kaca");
            setProductName(orderToEdit.product_name || "A5 (15x20cm)");
            setOrderSource(orderToEdit.order_source || "WhatsApp");
            setSelectedAddons(orderToEdit.add_ons || []);
            setFramePrice(orderToEdit.frame_price || 0);
            setDpAmount(orderToEdit.dp_amount || 0);
            setRepaymentAmount(orderToEdit.repayment_amount || 0);
            setShippingMethod(orderToEdit.shipping_method || "JNE");
            setNotes(orderToEdit.notes || "");

            // Parse JSON Isian Data Desain
            if (orderToEdit.design_data) {
                try {
                    const parsed = JSON.parse(orderToEdit.design_data);
                    if (Array.isArray(parsed)) {
                        setDesignFields(parsed);
                    } else {
                        setDesignFields(DEFAULT_DESIGN_FIELDS);
                    }
                } catch {
                    setDesignFields(DEFAULT_DESIGN_FIELDS);
                }
            } else {
                setDesignFields(DEFAULT_DESIGN_FIELDS);
            }
        } else {
            setCustomerName("");
            setPhoneNumber("");
            setAddress("");
            setCategory("Frame Tanpa Kaca");
            setProductName("A5 (15x20cm)");
            setOrderSource("WhatsApp");
            setSelectedAddons([]);
            setFramePrice(67000);
            setDpAmount(0);
            setRepaymentAmount(0);
            setDesignFields(DEFAULT_DESIGN_FIELDS);
            setShippingMethod("JNE");
            setNotes("");
        }
    }, [orderToEdit, isOpen]);

    // Handler Auto-fill Harga Frame
    const handleCategoryChange = (newCategory: string) => {
        setCategory(newCategory);
        const availableProducts = Object.keys(PRODUCT_CATALOG[newCategory] || {});
        const defaultProduct = availableProducts[0] || "";
        setProductName(defaultProduct);
        setFramePrice(PRODUCT_CATALOG[newCategory]?.[defaultProduct] || 0);
    };

    const handleProductChange = (newProduct: string) => {
        setProductName(newProduct);
        setFramePrice(PRODUCT_CATALOG[category]?.[newProduct] || 0);
    };

    // Handler Poin-Poin Desain Dinamis
    const handleFieldChange = (index: number, value: string) => {
        const updated = [...designFields];
        updated[index].value = value;
        setDesignFields(updated);
    };

    const handleKeyChange = (index: number, newKey: string) => {
        const updated = [...designFields];
        updated[index].key = newKey;
        setDesignFields(updated);
    };

    const handleAddField = () => {
        setDesignFields([...designFields, { key: "", value: "" }]);
    };

    const handleRemoveField = (index: number) => {
        setDesignFields(designFields.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    // Calculation
    const addonsPrice = selectedAddons.reduce((acc, addonName) => {
        const item = ADDON_OPTIONS.find((a) => a.name === addonName);
        return acc + (item ? item.price : 0);
    }, 0);

    const totalPrice = framePrice + addonsPrice;
    const remainingPayment = totalPrice - (dpAmount + repaymentAmount);

    const toggleAddon = (addonName: string) => {
        setSelectedAddons((prev) =>
            prev.includes(addonName)
                ? prev.filter((item) => item !== addonName)
                : [...prev, addonName]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            customer_name: customerName,
            phone_number: phoneNumber,
            address,
            product_name: productName,
            category,
            order_source: orderSource,
            add_ons: selectedAddons,
            frame_price: framePrice,
            addons_price: addonsPrice,
            dp_amount: dpAmount,
            repayment_amount: repaymentAmount,
            design_data: JSON.stringify(designFields), // Disimpan sebagai JSON stringified
            shipping_method: shippingMethod,
            notes,
        };

        let error;

        if (orderToEdit) {
            const res = await supabase.from("orders").update(payload).eq("id", orderToEdit.id);
            error = res.error;
        } else {
            const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
            const res = await supabase.from("orders").insert([
                {
                    ...payload,
                    order_number: orderNumber,
                    status: "Proses Design",
                },
            ]);
            error = res.error;
        }

        setLoading(false);

        if (error) {
            Swal.fire("Error!", "Terjadi kesalahan: " + error.message, "error");
        } else {
            Swal.fire("Berhasil!", orderToEdit ? "Pesanan berhasil diperbarui." : "Pesanan berhasil ditambahkan.", "success");
            onSuccess();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800 text-gray-800 dark:text-white">
                <h2 className="text-xl font-bold mb-4">
                    {orderToEdit ? `Edit Pesanan (${orderToEdit.order_number})` : "Input Data Pemesan Baru"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    {/* Data Pemesan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-medium mb-1">Nama Pemesan *</label>
                            <input
                                type="text"
                                required
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block font-medium mb-1">No. HP / WhatsApp *</label>
                            <input
                                type="text"
                                required
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-medium mb-1">Alamat Pengiriman</label>
                        <textarea
                            rows={2}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700"
                        />
                    </div>

                    {/* Kategori & Ukuran Produk */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-medium mb-1">Kategori Frame *</label>
                            <select
                                value={category}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-800"
                            >
                                <option value="Frame Tanpa Kaca">Frame Tanpa Kaca</option>
                                <option value="Frame Pakai Kaca">Frame Pakai Kaca</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-medium mb-1">Ukuran Produk *</label>
                            <select
                                value={productName}
                                onChange={(e) => handleProductChange(e.target.value)}
                                className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-800"
                            >
                                {Object.keys(PRODUCT_CATALOG[category] || {}).map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-medium mb-1">Order Lewat *</label>
                            <select
                                value={orderSource}
                                onChange={(e) => setOrderSource(e.target.value)}
                                className="w-full rounded-lg border p-2.5 bg-transparent dark:border-gray-700 dark:bg-gray-800"
                            >
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Shopee">Shopee</option>
                                <option value="Tokopedia">Tokopedia</option>
                                <option value="TikTok Shop">TikTok Shop</option>
                            </select>
                        </div>
                    </div>

                    {/* Tambahan / Add-ons */}
                    {/* <div>
                        <label className="block font-medium mb-1">Tambahan / Add-ons (Bisa pilih &gt; 1)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg dark:border-gray-700">
                            {ADDON_OPTIONS.map((addon) => (
                                <label key={addon.name} className="flex items-center gap-2 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        checked={selectedAddons.includes(addon.name)}
                                        onChange={() => toggleAddon(addon.name)}
                                        className="rounded border-gray-300 text-brand-500"
                                    />
                                    <span>{addon.name} (+Rp {addon.price.toLocaleString("id-ID")})</span>
                                </label>
                            ))}
                        </div>
                    </div> */}

                    {/* Perhitungan Harga */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">
                                    Harga Frame (Rp) <span className="text-gray-400 font-normal">(Auto/Editable)</span>
                                </label>
                                <input
                                    type="text"
                                    value={framePrice === 0 ? "" : framePrice.toLocaleString("id-ID")}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        setFramePrice(Number(raw));
                                    }}
                                    className="w-full rounded-lg border p-2 bg-transparent dark:border-gray-700 font-semibold text-brand-600 dark:text-brand-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Bayar DP (Rp)</label>
                                <input
                                    type="text"
                                    value={dpAmount === 0 ? "" : dpAmount.toLocaleString("id-ID")}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        setDpAmount(Number(raw));
                                    }}
                                    className="w-full rounded-lg border p-2 bg-transparent dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Pelunasan (Rp)</label>
                                <input
                                    type="text"
                                    value={repaymentAmount === 0 ? "" : repaymentAmount.toLocaleString("id-ID")}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        setRepaymentAmount(Number(raw));
                                    }}
                                    className="w-full rounded-lg border p-2 bg-transparent dark:border-gray-700"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t flex flex-wrap justify-between text-xs font-semibold">
                            {/* <span>Total Tambahan: Rp {addonsPrice.toLocaleString("id-ID")}</span> */}
                            <span>Total Harga: Rp {totalPrice.toLocaleString("id-ID")}</span>
                            <span className={remainingPayment <= 0 ? "text-emerald-500" : "text-rose-500"}>
                                Sisa Pembayaran: Rp {remainingPayment.toLocaleString("id-ID")} ({remainingPayment <= 0 ? "LUNAS" : "BELUM LUNAS"})
                            </span>
                        </div>
                    </div>

                    {/* Dynamic Key-Value Pairs untuk Data Desain */}
                    <div className="space-y-2 border border-gray-200 dark:border-gray-700 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex justify-between items-center mb-2">
                            <label className="font-medium text-sm">Isian Data dalam Desain</label>
                            <button
                                type="button"
                                onClick={handleAddField}
                                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                            >
                                + Tambah Poin Custom
                            </button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {designFields.map((field, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nama Poin"
                                        value={field.key}
                                        onChange={(e) => handleKeyChange(index, e.target.value)}
                                        className="w-1/3 rounded-lg border p-2 text-xs bg-white dark:bg-gray-800 dark:border-gray-700 font-semibold"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Isi data..."
                                        value={field.value}
                                        onChange={(e) => handleFieldChange(index, e.target.value)}
                                        className="flex-1 rounded-lg border p-2 text-xs bg-white dark:bg-gray-800 dark:border-gray-700"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveField(index)}
                                        className="text-rose-500 hover:text-rose-700 px-1 text-sm font-bold"
                                        title="Hapus poin ini"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50"
                        >
                            {loading ? "Menyimpan..." : "Simpan Pesanan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}