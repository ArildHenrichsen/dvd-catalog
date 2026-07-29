import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DVD-samlingen",
  description: "Privat DVD-katalog",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body>
        <header>
          <div className="container header-row">
            <Link
              className="brand"
              href="/"
              aria-label="Gå til DVD-samlingen"
            >
              <span
                className="brand-mark"
                aria-hidden="true"
              >
                ▶
              </span>

              <span className="app-title">
                DVD-samlingen
              </span>
            </Link>

            <nav
              className="header-actions"
              aria-label="Hovedhandlinger"
            >
              <Link
                className="button primary"
                href="/releases/new"
              >
                + Legg til
              </Link>

              <Link
                className="button"
                href="/api/export"
              >
                Eksporter
              </Link>

              <Link
                className="button"
                href="/movie-night"
              >
                Hva skal vi se?
              </Link>

              <Link
                className="button icon-button"
                href="/settings"
                aria-label="Innstillinger og verktøy"
                title="Innstillinger og verktøy"
              >
                <span aria-hidden="true">
                  ⚙
                </span>
              </Link>
            </nav>
          </div>
        </header>

        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
