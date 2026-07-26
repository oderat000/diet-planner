import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import ThemeRegistry from "@/components/ThemeRegistry";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { I18nProvider } from "@/lib/i18n";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

const description =
  "Build a free personal 7-day diet plan from real, published recipes — with USDA-sourced nutrition data, daily meal tracking, and a weight progress chart. No account, no invented numbers.";

export const metadata: Metadata = {
  metadataBase: new URL("https://diet-planner.app"),
  title: {
    default: "Diet Planner — real-recipe meal plans, no invented data",
    template: "%s · Diet Planner",
  },
  description,
  openGraph: {
    title: "Diet Planner — real-recipe meal plans, no invented data",
    description,
    type: "website",
    siteName: "Diet Planner",
  },
  twitter: {
    card: "summary",
    title: "Diet Planner — real-recipe meal plans, no invented data",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeRegistry>
          <I18nProvider>
            <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
              <Header />
              <Container maxWidth="md" sx={{ py: 4, flexGrow: 1 }}>
                {children}
              </Container>
              <Footer />
            </Box>
          </I18nProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
