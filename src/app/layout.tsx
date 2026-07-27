import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import ThemeRegistry from "@/components/ThemeRegistry";
import Header, { type HeaderUser } from "@/components/Header";
import { authConfigured } from "@/lib/auth/redis";
import { optionalUser } from "@/lib/auth/guard";
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

/**
 * Reading the session here makes every page dynamic, which the static GitHub Pages export
 * can't do — so on that build, and when Upstash isn't configured, the header simply omits
 * the account link rather than the build failing.
 */
async function headerUser(): Promise<HeaderUser> {
  if (process.env.GITHUB_PAGES === "true" || !authConfigured) return undefined;
  const current = await optionalUser();
  return current ? { username: current.user.username } : null;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await headerUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeRegistry>
          <I18nProvider>
            <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
              <Header user={user} />
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
