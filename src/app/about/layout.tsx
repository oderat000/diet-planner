import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About & FAQ",
  description:
    "Frequently asked questions about Diet Planner: cost, privacy, data sources, offline use, and whether it's medical advice.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
