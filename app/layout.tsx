import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "DVD-samlingen", description: "Privat DVD-katalog" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="nb"><body>
    <header><div className="container header-row"><Link href="/"><strong>DVD-samlingen</strong></Link><div className="actions"><Link className="button" href="/unlock">Skrivetilgang</Link><Link className="button" href="/api/export">CSV</Link><Link className="button primary" href="/releases/new">+ Legg til</Link></div></div></header>
    <main className="container">{children}</main>
  </body></html>;
}
