import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diet Planner — real-recipe meal plans, no invented data",
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
