import type { Metadata } from "next";
import { verifyEmailAction } from "@/lib/auth/actions";
import ConfirmButton from "./ConfirmButton";

// noindex + no referrer: the token is in the URL, so it must not reach search engines or
// leak to any third-party host through the Referer header on an outbound click.
export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function VerifyTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Bound server action: the token stays on the server side of the boundary.
  return <ConfirmButton confirm={verifyEmailAction.bind(null, decodeURIComponent(token))} />;
}
