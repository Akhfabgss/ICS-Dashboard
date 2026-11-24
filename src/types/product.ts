export interface BomRecipeItem {
  inventory_sku: string;
  inventory_name: string;
  quantity: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  status: "Active" | "Soon";
  sub_types?: string[];
  description?: string;
}

export interface MasterProduct {
  id: string;
  category_id?: string;
  category_name?: string; // e.g. "Card / TCG", "Action Figure", dsb.
  item_type: "Paket Grading" | "Komponen Suku Cadang" | "Layanan Tambahan";
  name: string;
  price: number;
  recipe: BomRecipeItem[];
  is_active: boolean;
}

/**
 * Mencocokkan input kategori (berupa nama, slug, id, atau alias legacy seperti TRADING_CARD)
 * dengan objek ServiceCategory resmi dari tabel product_categories secara aman dan case-insensitive.
 */
export function findMatchingCategory(
  categories: ServiceCategory[],
  identifier?: string | null,
  productCategoryNameOrId?: string | null
): ServiceCategory | undefined {
  if (!categories || categories.length === 0) return undefined;
  const rawId = (identifier || "").trim();

  // 1. Coba pencocokan langsung via identifier (ID, Name, Slug, atau normalized)
  if (rawId) {
    const clean = rawId.toLowerCase();
    const normalized = clean.replace(/[\s_-]/g, "");

    const directMatch = categories.find(
      (c) =>
        c.id === rawId ||
        c.name.trim().toLowerCase() === clean ||
        c.slug.trim().toLowerCase() === clean ||
        c.name.toLowerCase().replace(/[\s_-]/g, "") === normalized ||
        c.slug.toLowerCase().replace(/[\s_-]/g, "") === normalized
    );
    if (directMatch) return directMatch;

    // Cek Alias Legacy (misal: TRADING_CARD, tradingcard, cards, tcg -> TCG)
    if (
      normalized === "tradingcard" ||
      normalized === "card" ||
      normalized === "cards" ||
      normalized.includes("tcg")
    ) {
      const tcgCat = categories.find(
        (c) =>
          c.slug.toLowerCase() === "tcg" ||
          c.name.toUpperCase() === "TCG" ||
          c.name.toLowerCase().includes("tcg") ||
          c.name.toLowerCase().includes("card")
      );
      if (tcgCat) return tcgCat;
    }

    if (
      normalized === "actionfigure" ||
      normalized === "figure" ||
      normalized === "diecast" ||
      normalized.includes("figure")
    ) {
      const figCat = categories.find(
        (c) =>
          c.slug.toLowerCase() === "action-figure" ||
          c.name.toLowerCase().includes("figure")
      );
      if (figCat) return figCat;
    }
  }

  // 2. Cek lewat kategori produk jika disediakan
  if (productCategoryNameOrId) {
    const prodClean = productCategoryNameOrId.trim().toLowerCase();
    const prodNormalized = prodClean.replace(/[\s_-]/g, "");
    const prodMatch = categories.find(
      (c) =>
        c.id === productCategoryNameOrId ||
        c.name.trim().toLowerCase() === prodClean ||
        c.slug.trim().toLowerCase() === prodClean ||
        c.name.toLowerCase().replace(/[\s_-]/g, "") === prodNormalized ||
        c.slug.toLowerCase().replace(/[\s_-]/g, "") === prodNormalized
    );
    if (prodMatch) return prodMatch;
  }

  // 3. Fallback ke kategori pertama jika tersedia
  return categories[0];
}

/**
 * Mengambil array sub_types dari kategori dengan fallback aman ['OTHER']
 */
export function getCategorySubTypes(cat?: ServiceCategory): string[] {
  if (cat?.sub_types && Array.isArray(cat.sub_types) && cat.sub_types.length > 0) {
    return cat.sub_types;
  }
  return ["OTHER"];
}

/**
 * Mengambil elemen pertama sub_types sebagai nilai default
 */
export function getFirstSubType(cat?: ServiceCategory): string {
  const list = getCategorySubTypes(cat);
  return list[0] || "OTHER";
}
