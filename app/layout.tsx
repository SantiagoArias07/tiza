import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { Chrome } from "@/components/Chrome";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { PWA } from "@/components/PWA";
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
  manifest: "/manifest.webmanifest",
  applicationName: "Tiza",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tiza",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2C3D4C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
            <ConfirmProvider>
              <Chrome>{children}</Chrome>
            </ConfirmProvider>
          </StoreProvider>
        </AuthProvider>
        <PWA />
      </body>
    </html>
  );
}
