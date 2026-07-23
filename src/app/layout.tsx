import type { Metadata } from "next";
import Container from "@mui/material/Container";
import ThemeRegistry from "@/components/ThemeRegistry";
import Header from "@/components/Header";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diet Planner",
  description: "Personalized diet plans from real recipes, with progress tracking",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeRegistry>
          <I18nProvider>
            <Header />
            <Container maxWidth="md" sx={{ py: 4 }}>
              {children}
            </Container>
          </I18nProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
