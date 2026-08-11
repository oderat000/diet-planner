import type { Metadata } from "next";
import { Suspense } from "react";
import MenuExplorer from "@/components/MenuExplorer";

export const metadata: Metadata = {
  title: "Menu explorer",
  description: "Explore real dishes by region, category, food group, calories, protein, carbs, fat, and nutrition style.",
};

export default function MenuPage() {
  return <Suspense fallback={null}><MenuExplorer /></Suspense>;
}
