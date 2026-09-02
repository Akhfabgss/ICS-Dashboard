export type UserRole = "Owner" | "Bendahara" | "Staff";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  updated_at?: string;
}