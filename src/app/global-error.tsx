"use client";

/**
 * The last-resort error boundary.
 *
 * src/app/error.tsx catches errors thrown inside a page, but it renders *within*
 * the root layout — so it cannot catch an error thrown by the layout itself.
 * Without this file that case fell through to Next's unstyled default page.
 *
 * global-error replaces the whole document, which is why it has to render its
 * own <html> and <body>. It cannot use the app's fonts or Tailwind theme
 * variables either, since the failure may be in whatever provides them, so the
 * styling here is deliberately self-contained and minimal.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#221c15",
          color: "#f6f2e9",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#c9bfae",
              margin: 0,
            }}
          >
            Ney Heritage
          </p>
          <h1 style={{ fontSize: "1.75rem", margin: "0.75rem 0 0", lineHeight: 1.2 }}>
            Something went wrong at the root of the application
          </h1>
          <p style={{ color: "#c9bfae", lineHeight: 1.6, marginTop: "0.75rem" }}>
            This is an error in the page shell itself, not in the archive&apos;s
            data. Reloading usually clears it.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "#8f8578",
                marginTop: "1rem",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #6d6355",
              background: "transparent",
              color: "#f6f2e9",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
