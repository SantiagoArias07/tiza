"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Logo } from "./Logo";
import styles from "./AuthScreen.module.css";

export function AuthScreen({ mode: initial }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initial);
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) {
        await register({ name, school, email, password });
      } else {
        await login(email, password);
      }
      // Chrome redirects to "/" once the user is set.
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo conectar con el servidor"
      );
      setBusy(false);
    }
  }

  return (
    <div className={styles.screen}>
      {/* Visual panel */}
      <aside className={styles.visual}>
        <div className={styles.chalk} aria-hidden>
          <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            <path d="M40 320 Q120 260 200 300 T360 280" />
            <path d="M60 120 Q140 80 220 110" />
            <path d="M280 340 Q320 300 360 330" />
            <circle cx="310" cy="90" r="26" />
          </svg>
        </div>
        <div className={styles.visualContent}>
          <div className={styles.brand}>
            <Logo size={52} />
            <span className={styles.brandName}>Tiza</span>
          </div>
          <h1 className={styles.tagline}>
            Tu bitácora,
            <br />
            más clara.
          </h1>
          <p className={styles.blurb}>
            Calificaciones, asistencia y notas de tu grupo — en un solo lugar,
            cálido y sencillo.
          </p>
        </div>
        <span className={styles.visualFoot}>Bitácora digital docente</span>
      </aside>

      {/* Form */}
      <main className={styles.formSide}>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.mobileBrand}>
            <Logo size={38} />
            <span>Tiza</span>
          </div>

          <h2 className={styles.title}>
            {isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}
          </h2>
          <p className={styles.subtitle}>
            {isRegister
              ? "Empieza con un grupo de ejemplo listo para explorar."
              : "Entra para ver tus grupos."}
          </p>

          {isRegister && (
            <>
              <Field label="Nombre">
                <input
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Profe Marisol"
                  autoComplete="name"
                />
              </Field>
              <Field label="Escuela">
                <input
                  className={styles.input}
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Esc. Prim. Benito Juárez"
                />
              </Field>
            </>
          )}

          <Field label="Correo">
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.mx"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Contraseña">
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
            />
          </Field>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={busy}>
            {busy
              ? "Un momento…"
              : isRegister
              ? "Crear cuenta"
              : "Entrar"}
          </button>

          <p className={styles.toggle}>
            {isRegister ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => {
                setError("");
                setMode(isRegister ? "login" : "register");
              }}
            >
              {isRegister ? "Inicia sesión" : "Regístrate"}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}
