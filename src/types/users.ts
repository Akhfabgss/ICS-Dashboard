export type UserRole =
  | 'OWNER'
  | 'ADMIN'
  | 'SENIOR_GRADER'
  | 'OPERATOR'
  | 'Owner'
  | 'Bendahara'
  | 'Staff';

export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  address: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status?: 'active' | 'inactive';
  active_tasks?: number;
  updated_at?: string;
  created_at?: string;
}

export const ROLE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; description: string }
> = {
  OWNER: {
    label: 'Owner',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-800',
    description: 'Akses penuh ke seluruh sistem, keuangan lab, dan manajemen staf.',
  },
  ADMIN: {
    label: 'Admin',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800',
    description: 'Akses penuh ke submisi, keuangan, stok bahan lab, dan operasional.',
  },
  SENIOR_GRADER: {
    label: 'Senior Grader',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800',
    description: 'Fokus penilaian sub-grades 4 aspek, inspeksi optik forensik, & registri cert.',
  },
  OPERATOR: {
    label: 'Lab Operator',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800',
    description: 'Enkapsulasi sonic welding slab, penulisan chip NFC, dan packaging kurir.',
  },
};
