import { supabase } from "@/lib/supabase";

/**
 * Sinkronisasi otomatis pembayaran Submisi ke tabel cash_flows.
 * - Jika payment_status === "PAID" -> Buat / update pemasukan sebesar total_price.
 * - Jika payment_status === "DP" -> Buat / update pemasukan sebesar dp_amount.
 * - Jika UNPAID (atau nominal 0) -> Hapus catatan pemasukan untuk order_no tersebut jika sebelumnya ada.
 */
export async function syncSubmissionToCashFlow(params: {
  orderNo: string;
  collectorName: string;
  paymentStatus: "UNPAID" | "DP" | "PAID";
  totalPrice: number;
  dpAmount?: number;
  date?: string;
}) {
  const { orderNo, collectorName, paymentStatus, totalPrice, dpAmount = 0, date } = params;

  const paidAmount =
    paymentStatus === "PAID"
      ? Number(totalPrice) || 0
      : paymentStatus === "DP"
      ? Number(dpAmount) || 0
      : 0;

  const txDate = date || new Date().toISOString().split("T")[0];
  const description =
    paymentStatus === "PAID"
      ? `Pelunasan Submisi #${orderNo} (${collectorName})`
      : `Pembayaran DP Submisi #${orderNo} (${collectorName})`;

  // Cek apakah sudah ada entri cash_flows untuk order_no ini
  const { data: existingRows } = await supabase
    .from("cash_flows")
    .select("id")
    .eq("type", "income")
    .ilike("description", `%#${orderNo}%`);

  if (paidAmount <= 0) {
    // Jika status kembali UNPAID / nominal 0, hapus entri kas terkait order ini
    if (existingRows && existingRows.length > 0) {
      const ids = existingRows.map((r) => r.id);
      await supabase.from("cash_flows").delete().in("id", ids);
    }
    return;
  }

  if (existingRows && existingRows.length > 0) {
    // Update entri pertama & bersihkan duplikat jika ada
    const [firstRow, ...duplicates] = existingRows;
    await supabase
      .from("cash_flows")
      .update({
        date: txDate,
        category: "Pemasukan Submisi",
        description,
        amount: paidAmount,
      })
      .eq("id", firstRow.id);

    if (duplicates.length > 0) {
      await supabase
        .from("cash_flows")
        .delete()
        .in(
          "id",
          duplicates.map((d) => d.id)
        );
    }
  } else {
    // Insert catatan pemasukan baru
    await supabase.from("cash_flows").insert({
      date: txDate,
      ref_id: `REV-${orderNo.replace("SUB-", "")}`,
      category: "Pemasukan Submisi",
      description,
      amount: paidAmount,
      type: "income",
    });
  }
}

/**
 * Hapus entri cash_flows ketika submisi dihapus.
 */
export async function removeSubmissionFromCashFlow(orderNo: string) {
  await supabase
    .from("cash_flows")
    .delete()
    .eq("type", "income")
    .ilike("description", `%#${orderNo}%`);
}