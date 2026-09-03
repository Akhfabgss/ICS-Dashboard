import { supabase } from "@/lib/supabase";

/**
 * Mengurangi stok bahan baku (stock_out) berdasarkan resep produk & addon
 * yang tersimpan di tabel product_recipes dan addon_recipes.
 *
 * @param productName - Nama produk yang dipesan (akan di-resolve ke ID)
 * @param addonNames  - Array nama addon yang dipesan (akan di-resolve ke IDs)
 * @param orderQty    - Jumlah quantity order (default 1)
 */
export async function deductStockForOrder(
  productName: string,
  addonNames: string[] = [],
  orderQty: number = 1
): Promise<void> {
  try {
    // ── 1. Resolve product_id dari product_name ──────────────────────────
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("name", productName)
      .maybeSingle();

    if (productError) {
      console.error("stockDeduction: Gagal mengambil product:", productError.message);
      return;
    }

    const productId = productData?.id ?? null;

    // ── 2. Resolve addon_ids dari addon_names ────────────────────────────
    let addonIds: string[] = [];
    if (addonNames.length > 0) {
      // Filter hanya nama yang benar-benar ada (bukan string "Tambah foto (N Foto)")
      const cleanAddonNames = addonNames.filter(
        (n) => !n.toLowerCase().includes("tambah foto")
      );

      if (cleanAddonNames.length > 0) {
        const { data: addonData, error: addonError } = await supabase
          .from("add_ons")
          .select("id")
          .in("name", cleanAddonNames);

        if (addonError) {
          console.error("stockDeduction: Gagal mengambil addon IDs:", addonError.message);
        } else if (addonData) {
          addonIds = addonData.map((a) => a.id);
        }
      }
    }

    // ── 3. Ambil Resep Produk Utama ──────────────────────────────────────
    let productRecipes: { inventory_id: string; quantity_required: number }[] = [];
    if (productId) {
      const { data: pRecipes, error: pError } = await supabase
        .from("product_recipes")
        .select("inventory_id, quantity_required")
        .eq("product_id", productId);

      if (pError) {
        console.error("stockDeduction: Gagal mengambil resep produk:", pError.message);
      } else if (pRecipes) {
        productRecipes = pRecipes;
      }
    }

    // ── 4. Ambil Resep Add-ons ───────────────────────────────────────────
    let addonRecipes: { inventory_id: string; quantity_required: number }[] = [];
    if (addonIds.length > 0) {
      const { data: aRecipes, error: aError } = await supabase
        .from("addon_recipes")
        .select("inventory_id, quantity_required")
        .in("addon_id", addonIds);

      if (aError) {
        console.error("stockDeduction: Gagal mengambil resep addon:", aError.message);
      } else if (aRecipes) {
        addonRecipes = aRecipes;
      }
    }

    // ── 5. Gabungkan & akumulasi bahan baku per inventory_id ─────────────
    const allMaterials = [...productRecipes, ...addonRecipes];

    if (allMaterials.length === 0) {
      console.log(`stockDeduction: Tidak ada resep ditemukan untuk produk "${productName}". Stok tidak dipotong.`);
      return;
    }

    // Akumulasi quantity per inventory_id (hindari duplikasi)
    const materialMap: Record<string, number> = {};
    for (const item of allMaterials) {
      const key = item.inventory_id;
      materialMap[key] = (materialMap[key] ?? 0) + Number(item.quantity_required) * orderQty;
    }

    // ── 6. Update stock_out untuk setiap bahan baku ──────────────────────
    for (const [inventoryId, qtyToDeduct] of Object.entries(materialMap)) {
      const { data: inv, error: fetchError } = await supabase
        .from("inventory")
        .select("id, stock_out")
        .eq("id", inventoryId)
        .maybeSingle();

      if (fetchError) {
        console.error(`stockDeduction: Gagal membaca inventory id=${inventoryId}:`, fetchError.message);
        continue;
      }

      if (!inv) {
        console.warn(`stockDeduction: Item inventory id=${inventoryId} tidak ditemukan. Dilewati.`);
        continue;
      }

      const currentStockOut = Number(inv.stock_out ?? 0);
      const newStockOut = currentStockOut + qtyToDeduct;

      const { error: updateError } = await supabase
        .from("inventory")
        .update({ stock_out: newStockOut })
        .eq("id", inventoryId);

      if (updateError) {
        console.error(`stockDeduction: Gagal update inventory id=${inventoryId}:`, updateError.message);
      } else {
        console.log(`stockDeduction: inventory id=${inventoryId} → stock_out: ${currentStockOut} + ${qtyToDeduct} = ${newStockOut}`);
      }
    }
  } catch (error) {
    console.error("stockDeduction: Unexpected error:", error);
  }
}