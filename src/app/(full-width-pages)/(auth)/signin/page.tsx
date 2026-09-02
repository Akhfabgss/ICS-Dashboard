import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Framelo - POS & Management System",
  description:
    "Sistem Manajemen POS, Stok Material, dan Pengelolaan Keuangan Toko Framelo.",
};

export default function SignIn() {
  return <SignInForm />;
}
