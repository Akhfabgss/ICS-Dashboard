import { supabase } from "@/lib/supabase";

/**
 * Mengurangi stok bahan baku lab berdasarkan resep (BOM) produk yang tersimpan di database Supabase.
 * Dipanggil secara otomatis saat status submisi berubah menjadi 'Selesai & Kirim' (COMPLETED).
 *
 * @param productName - Nama produk/layanan grading yang dipesan (misal: "Express Grading (3 Hari)")
 * @param orderQty    - Jumlah kartu/item yang diproses (default: 1)
 * @param referenceNo - Nomor referensi submisi (misal: "SUB-829101")
 */
export async function deductStockForOrder(
  productName: string,
  orderQty: number = 1,
  referenceNo: string = "AUTO-DEDUCT"
): Promise<{ success: boolean; message: string }> {
  try {
    // ── 1. Cari product_id berdasarkan product_name ──────────────────────────
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id, name")
      .eq("name", productName)
      .maybeSingle();

    if (productError) {
      console.error("stockDeduction: Gagal mengambil data produk:", productError.message);
      return { success: false, message: `Gagal membaca produk: ${productError.message}` };
    }

    if (!productData) {
      console.warn(`stockDeduction: Produk "${productName}" tidak ditemukan di tabel products.`);
      return { success: false, message: `Produk "${productName}" tidak ditemukan.` };
    }

    // ── 2. Ambil Resep Bahan Lab (BOM) untuk Produk Ini ────────────────────
    const { data: recipes, error: recipeError } = await supabase
      .from("product_recipes")
      .select("inventory_id, quantity_required")
      .eq("product_id", productData.id);

    if (recipeError) {
      console.error("stockDeduction: Gagal mengambil resep produk:", recipeError.message);
      return { success: false, message: `Gagal mengambil resep: ${recipeError.message}` };
    }

    if (!recipes || recipes.length === 0) {
      console.log(`stockDeduction: Tidak ada resep bahan (BOM) yang terikat pada produk "${productName}".`);
      return { success: true, message: "Tidak ada resep bahan yang dipotong." };
    }

    // ── 3. Akumulasi Kebutuhan Bahan Per inventory_id ────────────────────────
    const materialMap: Record<string, number> = {};
    for (const item of recipes) {
      const invId = item.inventory_id;
      const totalRequired = Number(item.quantity_required) * orderQty;
      materialMap[invId] = (materialMap[invId] ?? 0) + totalRequired;
    }

    // ── 4. Eksekusi Pemotongan Stok & Catat Mutasi ke Supabase ─────────────
    for (const [inventoryId, qtyToDeduct] of Object.entries(materialMap)) {
      // Ambil data stok saat ini
      const { data: invItem, error: fetchInvError } = await supabase
        .from("lab_inventory")
        .select("id, sku, name, current_stock, min_stock")
        .eq("id", inventoryId)
        .maybeSingle();

      if (fetchInvError || !invItem) {
        console.error(`stockDeduction: Item inventory ID=${inventoryId} tidak ditemukan.`);
        continue;
      }

      // Hitung stok baru dan tentukan status aman/menipis
      const newStock = Math.max(0, Number(invItem.current_stock || 0) - qtyToDeduct);
      const newStatus = newStock <= invItem.min_stock ? "Menipis" : "Aman";

      // Update tabel lab_inventory
      const { error: updateInvError } = await supabase
        .from("lab_inventory")
        .update({
          current_stock: newStock,
          status: newStatus,
        })
        .eq("id", inventoryId);

      if (updateInvError) {
        console.error(`stockDeduction: Gagal update stok inventory SKU ${invItem.sku}:`, updateInvError.message);
        continue;
      }

      // Catat log ke tabel stock_mutations
      const { error: mutationError } = await supabase
        .from("stock_mutations")
        .insert({
          item_id: invItem.id,
          item_sku: invItem.sku,
          item_name: invItem.name,
          type: "OUT",
          quantity: qtyToDeduct,
          reference_no: referenceNo,
          notes: `Otomatis terpotong: Submisi ${productName} (${orderQty} kartu)`,
        });

      if (mutationError) {
        console.error(`stockDeduction: Gagal mencatat mutasi stok SKU ${invItem.sku}:`, mutationError.message);
      } else {
        console.log(
          `stockDeduction: Sukses memotong SKU ${invItem.sku} (-${qtyToDeduct}). Stok sisa: ${newStock}`
        );
      }
    }

    return {
      success: true,
      message: `Stok bahan lab untuk ${productName} (${orderQty} kartu) berhasil dipotong.`,
    };
  } catch (error) {
    console.error("stockDeduction: Unexpected error:", error);
    return { success: false, message: "Terjadi kesalahan sistem saat pemotongan stok." };
  }
}