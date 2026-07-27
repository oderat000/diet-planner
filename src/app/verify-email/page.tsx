import type { Metadata } from "next";
import ResendVerificationForm from "@/components/auth/ResendVerificationForm";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

export default function VerifyEmailPage() {
  return <ResendVerificationForm />;
}
