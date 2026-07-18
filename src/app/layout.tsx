import type { Metadata } from "next";
import Container from "@mui/material/Container";
import ThemeRegistry from "@/components/ThemeRegistry";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diet Planner",
  description: "AI-generated diet plan with progress tracking",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeRegistry>
          <Header />
          <Container maxWidth="md" sx={{ py: 4 }}>
            {children}
          </Container>
        </ThemeRegistry>
      </body>
    </html>
  );
}
