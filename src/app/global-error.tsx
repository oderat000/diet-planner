"use client"; // error boundaries must be Client Components

/**
 * Last resort: this replaces the root layout, so it fires when the layout itself failed.
 * That means neither ThemeRegistry nor I18nProvider is mounted — hence plain markup,
 * inline styles and English text. Anything imported here is one more thing that can
 * break at the exact moment nothing else works.
 *
 * It must render its own <html> and <body>.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#fff",
          color: "#111",
        }}
      >
        <main style={{ maxWidth: "32rem", padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#555", lineHeight: 1.6 }}>
            The app failed to start. Your saved plans are stored on this device and have
            not been affected.
          </p>
          {error.digest ? (
            <p style={{ color: "#888", fontSize: "0.875rem" }}>ref: {error.digest}</p>
          ) : null}
          <button
            onClick={() => unstable_retry()}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.2rem",
              fontSize: "1rem",
              cursor: "pointer",
              border: "1px solid #111",
              borderRadius: "0.375rem",
              background: "#111",
              color: "#fff",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
