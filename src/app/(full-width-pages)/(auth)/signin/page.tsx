import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ICS - Management System",
  description:
    "Sistem Manajemen POS, Stok Material, dan Pengelolaan Keuangan Toko ICS.",
};

export default function SignIn() {
  return <SignInForm />;
}
