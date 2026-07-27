"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Modal } from "./ui";
import styles from "./ConfirmDialog.module.css";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    // If a dialog is somehow already open, resolve it false before replacing.
    resolver.current?.(false);
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <Modal width={380} onClose={() => close(false)}>
          <div className={styles.body}>
            <span className={styles.icon} data-danger={opts.danger}>
              {opts.danger ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
              )}
            </span>
            <h2 className={styles.title}>{opts.title}</h2>
            {opts.message && <p className={styles.message}>{opts.message}</p>}
          </div>
          <div className={styles.actions}>
            <button className={styles.cancel} onClick={() => close(false)}>
              {opts.cancelText ?? "Cancelar"}
            </button>
            <button
              className={opts.danger ? styles.confirmDanger : styles.confirm}
              autoFocus
              onClick={() => close(true)}
            >
              {opts.confirmText ?? "Aceptar"}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

/** Promise-based confirm; resolves true if the user confirms. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
