export type WorkflowStatus =
  | 'Dalam Daftar'
  | 'Pengerjaan'
  | 'Selesai & Kirim'
  | 'Ditolak';

export type PaymentStatus = 'LUNAS' | 'DP' | 'UNPAID';

export type TCGCategory =
  | 'Pokémon'
  | 'One Piece'
  | 'Yu-Gi-Oh!'
  | 'Magic: The Gathering'
  | 'Dragon Ball'
  | 'Sports Cards'
  | 'Weiss Schwarz'
  | 'Other';

export interface SubGrades {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
}

export interface Submission {
  id: string;
  order_no: string; // e.g. SUB-240101
  collector_name: string;
  phone_number: string;
  address: string;
  card_name: string;
  card_set: string;
  card_year?: string;
  tcg_category: TCGCategory;
  service_tier: string; // e.g. Standard 7-14 Days, Express 3 Days
  total_price: number;
  dp_amount: number;
  remaining_payment: number;
  payment_status: PaymentStatus;
  workflow_status: WorkflowStatus;
  courier: string; // e.g. JNE, SiCepat, Paxel, Drop-off Lab
  tracking_number: string;
  assigned_grader: string;
  cert_id: string; // e.g. ICS-TR-849201
  sub_grades: SubGrades;
  final_grade: number;
  grade_label: string; // e.g. Gem Mint 10, Mint+ 9.5
  forensic_photos_url: string; // Google Drive link
  grader_notes: string;
  card_count?: number;
  created_at: string;
  updated_at?: string;
}

export function generateCertId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ICS-TR-${randomPart}`;
}

export function calculateFinalGrade(
  centering: number,
  corners: number,
  edges: number,
  surface: number
): { finalGrade: number; label: string } {
  const subgrades = [centering, corners, edges, surface];
  const lowest = Math.min(...subgrades);
  const avg = (centering + corners + edges + surface) / 4;

  // Industry Standard Rule (Beckett/CGC):
  // Overall grade cannot be more than 0.5 points higher than the lowest subgrade
  let computed = Math.min(avg, lowest + 0.5);

  // Round to nearest 0.5
  computed = Math.round(computed * 2) / 2;
  if (computed > 10) computed = 10;
  if (computed < 1) computed = 1;

  // Perfect 10 check
  if (centering === 10 && corners === 10 && edges === 10 && surface === 10) {
    return { finalGrade: 10, label: 'Pristine 10 (Black Label)' };
  }

  if (computed === 10) return { finalGrade: 10, label: 'Gem Mint 10' };
  if (computed === 9.5) return { finalGrade: 9.5, label: 'Mint+ 9.5' };
  if (computed === 9.0) return { finalGrade: 9.0, label: 'Mint 9' };
  if (computed === 8.5) return { finalGrade: 8.5, label: 'NM-MT+ 8.5' };
  if (computed === 8.0) return { finalGrade: 8.0, label: 'NM-MT 8' };
  if (computed === 7.5) return { finalGrade: 7.5, label: 'Near Mint+ 7.5' };
  if (computed === 7.0) return { finalGrade: 7.0, label: 'Near Mint 7' };
  if (computed >= 6.0) return { finalGrade: computed, label: `Excellent-Mint ${computed}` };
  if (computed >= 4.0) return { finalGrade: computed, label: `Very Good ${computed}` };
  return { finalGrade: computed, label: `Authentic / Good ${computed}` };
}

export const WORKFLOW_STATUS_CONFIG: Record<
  WorkflowStatus,
  { bg: string; text: string; border: string; step: number }
> = {
  'Dalam Daftar': {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    step: 1,
  },
  'Pengerjaan': {
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    step: 4,
  },
  'Selesai & Kirim': {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    step: 6,
  },
  'Ditolak': {
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
    step: 0,
  },
};