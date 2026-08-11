import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
