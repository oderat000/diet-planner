import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Diet Planner sources real recipes and USDA nutrition data, and computes calorie and protein targets — without inventing any numbers.",
};

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
