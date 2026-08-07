import type { Metadata, Viewport } from "next";
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

// GitHub Pages serves the app under /diet-planner/, so asset hrefs written by hand here
// need the same prefix next.config.ts applies to everything Next emits itself.
const basePath = process.env.GITHUB_PAGES === "true" ? "/diet-planner" : "";

/**
 * `viewportFit: "cover"` lets the page paint under the iPhone notch and home indicator;
 * the header and footer then claim that space back with env(safe-area-inset-*).
 * `maximumScale` is deliberately left at the default so pinch-zoom keeps working —
 * locking it out fails WCAG 1.4.4 and Apple's own accessibility review.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9e6dd" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a19" },
  ],
};

export const metadata: Metadata = {
  applicationName: "Diet Planner",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    title: "Diet Planner",
    statusBarStyle: "default",
  },
  // iOS ignores the manifest's icons; it reads this link instead when adding to the home screen
  icons: {
    icon: [
      { url: `${basePath}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${basePath}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${basePath}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
  formatDetection: {
    // iOS otherwise turns "1800 kcal" and dates into blue tappable phone links
    telephone: false,
    date: false,
  },
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
              <Container
                maxWidth="md"
                sx={{
                  py: { xs: 2, sm: 4 },
                  // phones give up 32px of a 375px screen to the default gutters
                  px: { xs: 1.5, sm: 3 },
                  flexGrow: 1,
                }}
              >
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
