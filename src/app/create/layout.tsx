import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your plan",
  description:
    "Build your personal 7-day diet plan from real recipes and USDA nutrition data — enter your details and generate a plan in seconds.",
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
