"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { MasterProduct, BomRecipeItem, ServiceCategory } from "@/types/product";
import { LabInventoryItem } from "@/types/inventory";
import CategoryManager from "@/components/products/CategoryManagerModal";
import {
  Package,
  Plus,
  Trash2,
  Boxes,
  Edit,
  FolderPlus,
  Tag,
  X,
} from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [labInventory, setLabInventory] = useState<LabInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter Active Category Tab
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");

  // Modal State Master Produk Baru
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [itemCategory, setItemCategory] = useState<string>("");
  const [itemType, setItemType] = useState<
    "Paket Grading" | "Komponen Suku Cadang" | "Layanan Tambahan"
  >("Paket Grading");
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState<number>(350000);

  // Modal State Kelola Kategori & Sub-Tipe (CategoryManager)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Modal State Atur Resep Bahan Lab (BOM)
  const [selectedProdForRecipe, setSelectedProdForRecipe] = useState<MasterProduct | null>(null);
  const [selectedMaterialSku, setSelectedMaterialSku] = useState<string>("");
  const [materialQty, setMaterialQty] = useState<number>(1);

  // Fetch seluruh data dari Supabase
  const fetchData = async () => {
    setLoading(true);

    try {
      const [
        { data: catData, error: catErr },
        { data: prodData, error: prodErr },
        { data: invData, error: invErr },
        { data: recipeData, error: recipeErr },
      ] = await Promise.all([
        supabase
          .from("product_categories")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("lab_inventory").select("*"),
        supabase.from("product_recipes").select("*"),
      ]);

      if (catErr) throw catErr;
      if (prodErr) throw prodErr;
      if (invErr) throw invErr;
      if (recipeErr) throw recipeErr;

      const safeCategories = catData || [];
      const safeProducts = prodData || [];
      const safeInventory = invData || [];
      const safeRecipes = recipeData || [];

      setCategories(safeCategories as ServiceCategory[]);
      setLabInventory(safeInventory as LabInventoryItem[]);

      // Gabungkan product_recipes dengan data produk dan inventaris
      const productsWithRecipes = safeProducts.map((product) => {
        const productRecipes = safeRecipes.filter(
          (recipe) => recipe.product_id === product.id
        );

        const recipeItems: BomRecipeItem[] = productRecipes
          .map((recipe) => {
            const inventory = safeInventory.find(
              (item) => item.id === recipe.inventory_id
            );

            if (!inventory) return null;

            return {
              inventory_sku: inventory.sku,
              inventory_name: inventory.name,
              quantity: recipe.quantity_required,
            };
          })
          .filter((item): item is BomRecipeItem => item !== null);

        return {
          ...product,
          recipe: recipeItems,
        };
      });

      setProducts(productsWithRecipes as MasterProduct[]);

      // Pilih kategori pertama jika kategori belum dipilih
      if (safeCategories.length > 0) {
        setItemCategory((current) =>
          current && safeCategories.some((cat) => cat.name === current)
            ? current
            : safeCategories[0].name
        );
      } else {
        setItemCategory("");
      }
    } catch (err: any) {
      console.error("Gagal mengambil data katalog:", err);
      Swal.fire(
        "Gagal Memuat Data!",
        err.message || "Periksa koneksi dan policy RLS Supabase.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Toggle Status Kategori (Active / Soon) di Supabase
  const toggleCategoryStatus = async (id: string, currentStatus: "Active" | "Soon") => {
    const nextStatus = currentStatus === "Active" ? "Soon" : "Active";
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );

    const { error } = await supabase
      .from("product_categories")
      .update({ status: nextStatus })
      .eq("id", id);

    if (error) {
      Swal.fire("Gagal Update Status!", error.message, "error");
      fetchData();
    }
  };

  // Hapus kategori dari Supabase
  const handleDeleteCategory = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: "Hapus Kategori?",
      text: `Kategori "${name}" akan dihapus. Nama kategori pada produk yang sudah ada tidak ikut berubah.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCategories((prev) => prev.filter((category) => category.id !== id));

      if (selectedCategoryFilter === name) {
        setSelectedCategoryFilter("All");
      }

      if (itemCategory === name) {
        const remainingCategory = categories.find((category) => category.id !== id);
        setItemCategory(remainingCategory?.name || "");
      }

      Swal.fire("Terhapus!", `Kategori "${name}" berhasil dihapus.`, "success");
    } catch (err: any) {
      Swal.fire("Gagal Menghapus!", err.message, "error");
    }
  };

  // Toggle Status Aktif Produk di Supabase
  const toggleProductStatus = async (id: string, currentActive: boolean) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );

    const { error } = await supabase
      .from("products")
      .update({ is_active: !currentActive })
      .eq("id", id);

    if (error) {
      Swal.fire("Gagal Update Produk!", error.message, "error");
      fetchData();
    }
  };

  // Hapus Produk dari Supabase
  const handleDeleteProduct = async (id: string, name: string) => {
    const res = await Swal.fire({
      title: "Hapus Produk?",
      text: `Apakah Anda yakin ingin menghapus produk "${name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (res.isConfirmed) {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (!error) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        Swal.fire("Terhapus!", `Produk ${name} telah dihapus.`, "success");
      } else {
        Swal.fire("Gagal Hapus!", error.message, "error");
      }
    }
  };

  // Tambah Produk Baru ke Supabase
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemCategory) {
      Swal.fire("Kategori Belum Ada", "Tambahkan kategori sebelum membuat produk.", "warning");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("products")
        .insert({
          category_name: itemCategory,
          item_type: itemType,
          name: productName,
          price: Number(productPrice),
          is_active: true,
        })
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setProducts([data as MasterProduct, ...products]);
        setIsProductModalOpen(false);
        setProductName("");
        setProductPrice(350000);
        Swal.fire("Produk Berhasil Ditambahkan!", "Data tersimpan di Supabase.", "success");
      }
    } catch (err: any) {
      Swal.fire("Gagal Menyimpan Produk!", err.message || "Periksa izin RLS di Supabase.", "error");
    }
  };

  // Tambah bahan ke resep BOM (CREATE atau UPDATE di Supabase)
  const handleAddMaterialToRecipe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProdForRecipe || !selectedMaterialSku) return;

    const inventoryItem = labInventory.find(
      (item) => item.sku === selectedMaterialSku
    );

    if (!inventoryItem) {
      Swal.fire("Bahan Tidak Ditemukan", "Pilih bahan inventaris yang valid.", "warning");
      return;
    }

    const qty = Number(materialQty);

    if (!Number.isInteger(qty) || qty <= 0) {
      Swal.fire("Jumlah Tidak Valid", "Jumlah bahan harus berupa bilangan bulat lebih dari 0.", "warning");
      return;
    }

    try {
      const { data: existingRecipe, error: findError } = await supabase
        .from("product_recipes")
        .select("id, quantity_required")
        .eq("product_id", selectedProdForRecipe.id)
        .eq("inventory_id", inventoryItem.id)
        .maybeSingle();

      if (findError) throw findError;

      if (existingRecipe) {
        const { error: updateError } = await supabase
          .from("product_recipes")
          .update({
            quantity_required: existingRecipe.quantity_required + qty,
          })
          .eq("id", existingRecipe.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("product_recipes")
          .insert({
            product_id: selectedProdForRecipe.id,
            inventory_id: inventoryItem.id,
            quantity_required: qty,
          });

        if (insertError) throw insertError;
      }

      const updatedRecipe: BomRecipeItem[] = [
        ...(selectedProdForRecipe.recipe || []).map((item) => ({ ...item })),
      ];

      const existingIndex = updatedRecipe.findIndex(
        (item) => item.inventory_sku === inventoryItem.sku
      );

      if (existingIndex >= 0) {
        updatedRecipe[existingIndex] = {
          ...updatedRecipe[existingIndex],
          quantity: updatedRecipe[existingIndex].quantity + qty,
        };
      } else {
        updatedRecipe.push({
          inventory_sku: inventoryItem.sku,
          inventory_name: inventoryItem.name,
          quantity: qty,
        });
      }

      const updatedProduct = {
        ...selectedProdForRecipe,
        recipe: updatedRecipe,
      };

      setSelectedProdForRecipe(updatedProduct);
      setProducts((prev) =>
        prev.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product
        )
      );

      setMaterialQty(1);
      setSelectedMaterialSku("");

      Swal.fire("Berhasil!", "Resep bahan berhasil disimpan ke Supabase.", "success");
    } catch (err: any) {
      console.error("Gagal menyimpan resep:", err);
      Swal.fire(
        "Gagal Menyimpan Resep!",
        err.message || "Periksa policy RLS tabel product_recipes.",
        "error"
      );
    }
  };

  // Hapus bahan dari resep BOM (DELETE di Supabase)
  const handleRemoveMaterialFromRecipe = async (sku: string) => {
    if (!selectedProdForRecipe) return;

    const inventoryItem = labInventory.find((item) => item.sku === sku);

    if (!inventoryItem) {
      Swal.fire("Bahan Tidak Ditemukan", "Data inventaris tidak ditemukan.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Hapus Bahan dari Resep?",
      text: `Bahan "${inventoryItem.name}" akan dihapus dari resep produk ini.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from("product_recipes")
        .delete()
        .eq("product_id", selectedProdForRecipe.id)
        .eq("inventory_id", inventoryItem.id);

      if (error) throw error;

      const updatedRecipe = (selectedProdForRecipe.recipe || []).filter(
        (item) => item.inventory_sku !== sku
      );

      const updatedProduct = {
        ...selectedProdForRecipe,
        recipe: updatedRecipe,
      };

      setSelectedProdForRecipe(updatedProduct);
      setProducts((prev) =>
        prev.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product
        )
      );

      Swal.fire("Terhapus!", "Bahan berhasil dihapus dari resep.", "success");
    } catch (err: any) {
      console.error("Gagal menghapus resep:", err);
      Swal.fire("Gagal Menghapus!", err.message, "error");
    }
  };

  // Filtered Products berdasarkan Kategori Tab yang dipilih
  const filteredProducts = useMemo(() => {
    if (selectedCategoryFilter === "All") return products;
    return products.filter((p) => p.category_name === selectedCategoryFilter);
  }, [products, selectedCategoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-600" />
            Katalog Layanan &amp; Resep Bahan Lab (BOM)
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Konfigurasi kategori item koleksi, master produk layanan, dan resep alokasi bahan baku lab.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-brand-600" />
            Kelola Kategori &amp; Sub-Tipe
          </button>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk Baru
          </button>
        </div>
      </div>

      {/* BARIS KATEGORI DINAMIS (WIDGET TABS) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-brand-600" />
            Kategori Layanan Koleksi (Dinamis)
          </span>
          <span className="text-[11px] text-gray-400">
            Klik status badge untuk mengubah (Active/Soon) • Atur sub-tipe di tombol &quot;Kelola Kategori &amp; Sub-Tipe&quot;
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategoryFilter("All")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${selectedCategoryFilter === "All"
              ? "bg-brand-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200"
              }`}
          >
            Semua Produk ({products.length})
          </button>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${selectedCategoryFilter === cat.name
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 font-bold text-brand-700 dark:text-brand-300"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/60 text-gray-700 dark:text-gray-300"
                }`}
            >
              <button
                onClick={() => setSelectedCategoryFilter(cat.name)}
                className="font-bold cursor-pointer hover:underline"
              >
                {cat.name}
              </button>

              <button
                onClick={() => toggleCategoryStatus(cat.id, cat.status as "Active" | "Soon")}
                title="Klik untuk ubah status Active / Soon"
                className={`px-2 py-0.5 rounded-full text-[9px] font-black cursor-pointer transition-transform active:scale-95 ${cat.status === "Active"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"
                  }`}
              >
                {cat.status}
              </button>
              <button
                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                title="Hapus kategori"
                className="text-gray-400 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* BANNER INFORMASI AUTOMASI MUTASI STOK */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/50 flex items-start gap-3 text-xs">
        <Boxes className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-indigo-900 dark:text-indigo-300 block">
            Automasi Mutasi Stok Terintegrasi (Systemic Auto-Deduction)
          </span>
          <p className="text-indigo-700 dark:text-indigo-400 mt-0.5">
            Setiap kali submisi dengan produk tertentu diselesaikan (status: <strong>Selesai &amp; Kirim / COMPLETED</strong>), stok bahan lab yang terikat dalam <strong>Resep Bahan (BOM)</strong> produk tersebut akan otomatis dipotong secara sistemik dari modul Inventaris.
          </p>
        </div>
      </div>

      {/* TABEL MASTER PRODUK */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Daftar Produk Layanan {selectedCategoryFilter !== "All" ? `- ${selectedCategoryFilter}` : ""}
          </h3>
          <span className="text-xs font-semibold text-gray-500">
            Total {filteredProducts.length} Produk
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400 tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Tipe Item</th>
                <th className="py-3 px-3">Nama Produk / Item</th>
                <th className="py-3 px-3 text-right">Harga Satuan (Rp)</th>
                <th className="py-3 px-3">Resep Bahan Lab (BOM)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Memuat katalog produk...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Belum ada produk untuk kategori ini.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-3 font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                      {item.category_name || "Card / TCG"}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {item.item_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-bold text-gray-900 dark:text-white">
                      {item.name}
                    </td>

                    <td className="py-3.5 px-3 text-right font-black text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      Rp {Number(item.price || 0).toLocaleString("id-ID")}
                    </td>

                    <td className="py-3.5 px-3 max-w-xs">
                      <div className="space-y-1">
                        {!item.recipe || item.recipe.length === 0 ? (
                          <span className="text-gray-400 italic text-[11px] block">Belum ada resep bahan</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {item.recipe.map((r, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                              >
                                {r.quantity}x {r.inventory_name}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => setSelectedProdForRecipe(item)}
                          className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 cursor-pointer mt-1"
                        >
                          <Edit className="w-3 h-3" />
                          Atur Resep BOM
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => toggleProductStatus(item.id, item.is_active)}
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${item.is_active
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                      >
                        {item.is_active ? "Aktif" : "Non-Aktif"}
                      </button>
                    </td>

                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteProduct(item.id, item.name)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL KELOLA KATEGORI & SUB-TIPE (CategoryManager) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-brand-600" />
                Kelola Kategori Layanan &amp; Sub-Tipe Item
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <CategoryManager
              categories={categories}
              onRefresh={fetchData}
            />
          </div>
        </div>
      )}

      {/* MODAL ATUR RESEP BAHAN LAB (BOM) */}
      {selectedProdForRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5 text-xs my-8">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Atur Resep Bahan Lab (BOM)
              </h3>
              <p className="text-gray-500 mt-0.5">
                Produk: <strong className="text-brand-600">{selectedProdForRecipe.name}</strong>
              </p>
            </div>

            <form
              onSubmit={handleAddMaterialToRecipe}
              className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div>
                <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  Pilih Bahan Lab (Dari Inventaris) *
                </label>
                <select
                  required
                  value={selectedMaterialSku}
                  onChange={(e) => setSelectedMaterialSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium cursor-pointer"
                >
                  <option value="">-- Pilih Komponen Lab --</option>
                  {labInventory.map((inv) => (
                    <option key={inv.id} value={inv.sku}>
                      {inv.name} ({inv.sku}) - Stok: {inv.current_stock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  Jumlah Pemakaian (Pcs/Unit) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={materialQty}
                  onChange={(e) => setMaterialQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambahkan Ke Resep Produk
              </button>
            </form>

            <div className="space-y-2">
              <span className="font-bold text-gray-800 dark:text-gray-200 block">
                Widget Daftar Bahan Terikat Saat Ini:
              </span>

              {!selectedProdForRecipe.recipe || selectedProdForRecipe.recipe.length === 0 ? (
                <div className="p-4 text-center text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  Belum ada bahan lab yang dimasukkan ke dalam resep.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedProdForRecipe.recipe.map((item) => (
                    <div
                      key={item.inventory_sku}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <div>
                        <span className="font-mono text-[10px] text-brand-600 dark:text-brand-400 font-bold block">
                          {item.inventory_sku}
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {item.inventory_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {item.quantity} Unit
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialFromRecipe(item.inventory_sku)}
                          className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedProdForRecipe(null)}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold cursor-pointer"
              >
                Selesai Atur Resep
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREATE PRODUK BARU */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Tambah Master Produk Baru
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Pilih Kategori Layanan *</label>
                <select
                  required
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  disabled={categories.length === 0}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>
                    {categories.length === 0
                      ? "Tambahkan kategori terlebih dahulu"
                      : "-- Pilih Kategori --"}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Tipe Item Produk *</label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold cursor-pointer"
                >
                  <option value="Paket Grading">Paket Grading</option>
                  <option value="Komponen Suku Cadang">Komponen Suku Cadang</option>
                  <option value="Layanan Tambahan">Layanan Tambahan</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Nama Produk / Item *</label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Action Figure Acrylic Shell Standard"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Harga Satuan (Rp) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={productPrice}
                  onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-black text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold cursor-pointer"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}