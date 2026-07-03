import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { Chrome } from "@/components/Chrome";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tiza · Bitácora docente",
  description: "Bitácora digital para maestros de primaria.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body>
        <AuthProvider>
          <StoreProvider>
            <Chrome>{children}</Chrome>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
