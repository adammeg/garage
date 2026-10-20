import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atelier | Gestion de garage",
  description: "Suivi des véhicules, entretiens et opérations du garage.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
