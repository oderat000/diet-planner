import type { Metadata } from "next";
import StaticAuthHandoff from "@/components/auth/StaticAuthHandoff";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function StaticLoginPage() {
  return <StaticAuthHandoff destination="/login" title="Sign in" action="Sign in" />;
}
