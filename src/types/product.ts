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