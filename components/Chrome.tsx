"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AppShell } from "./AppShell";
import { Logo } from "./Logo";
import styles from "./Chrome.module.css";

const PUBLIC_ROUTES = ["/login", "/register"];

export function Chrome({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic) router.replace("/");
  }, [user, loading, isPublic, router]);

  if (loading) {
    return (
      <div className={styles.splash}>
        <Logo size={44} />
        <span className={styles.splashText}>Tiza</span>
      </div>
    );
  }

  // Public pages (login/register) render without the app shell.
  if (isPublic) return <>{children}</>;

  // Protected pages: wait for redirect if unauthenticated.
  if (!user) {
    return (
      <div className={styles.splash}>
        <Logo size={44} />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
