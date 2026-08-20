import "./globals.css";

export const metadata = {
  title: "Cămin Romantic — Referate de Necesitate",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
