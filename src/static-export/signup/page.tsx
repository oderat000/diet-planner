import type { Metadata } from "next";
import StaticAuthHandoff from "@/components/auth/StaticAuthHandoff";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function StaticSignupPage() {
  return (
    <StaticAuthHandoff destination="/signup" title="Create an account" action="Sign up" />
  );
}
