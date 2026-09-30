import "./globals.css";
import AnimatedBackground from "./AnimatedBackground";

export const metadata = {
  title: "Cămin Romantic — Referate de Necesitate",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>
        <AnimatedBackground />
        {children}
      </body>
    </html>
  );
}
