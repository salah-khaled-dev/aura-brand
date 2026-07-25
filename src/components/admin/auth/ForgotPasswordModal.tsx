"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconMail, IconSend, IconX } from "@tabler/icons-react";
import { toast } from "sonner";

import { adminAr } from "@/lib/i18n/admin-ar";
import { AuthService, AuthError } from "@/lib/services/auth.service";
import { AuthInput } from "./AuthInput";
import { AuthButton } from "./AuthButton";

const t = adminAr.forgotPasswordModal;

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Requests a recovery email for the admin panel. Styled after RequestAccessModal in LoginScreen. */
export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setError("");
    setSending(false);
    setSent(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) modalRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(adminAr.login.errors.emailInvalid);
      return;
    }
    setError("");
    setSending(true);
    try {
      await AuthService.requestPasswordReset(trimmed);
      setSent(true);
    } catch (err) {
      console.error('Password reset failed:', {
        message: err instanceof Error ? err.message : String(err),
        code: err instanceof AuthError ? err.code : undefined,
        details: err,
      });
      // Message varies only by network-vs-not; neither reveals whether the
      // email is registered, so account enumeration is still not possible.
      toast.error(
        err instanceof AuthError && err.code === 'network'
          ? adminAr.login.errors.network
          : adminAr.login.errors.unknown
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-[420px] rounded-[var(--admin-radius-2xl)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-card)] p-6 shadow-[var(--admin-shadow-2xl)] focus:outline-none z-10 font-sans"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-password-title"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="absolute end-4 top-4 rounded-[var(--admin-radius-sm)] p-1 text-[var(--admin-text-subtle)] transition-colors hover:text-[var(--admin-text-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
            >
              <IconX size={18} stroke={2} />
            </button>

            <div className="mb-5 mt-1 flex items-start gap-3.5 text-start">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--admin-radius-lg)] bg-[var(--admin-primary-muted)] text-[var(--admin-primary)]">
                <IconMail size={20} stroke={1.8} />
              </span>
              <div>
                <h3 id="forgot-password-title" className="text-base font-bold text-[var(--admin-text-base)]">
                  {t.title}
                </h3>
              </div>
            </div>

            {sent ? (
              <div className="text-start">
                <p className="rounded-[var(--admin-radius-md)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-surface)] p-3.5 text-xs leading-relaxed text-[var(--admin-text-muted)]">
                  {t.success}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 text-[13px] font-semibold text-[var(--admin-primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)] rounded-[var(--admin-radius-sm)]"
                >
                  {t.backToLogin}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4 text-start">
                <p className="text-xs leading-relaxed text-[var(--admin-text-muted)]">{t.description}</p>
                <AuthInput
                  ref={emailRef}
                  label={t.emailLabel}
                  type="email"
                  autoComplete="email"
                  dir="ltr"
                  className="text-start"
                  leadingIcon={<IconMail size={18} stroke={1.6} />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error}
                  disabled={sending}
                />
                <AuthButton type="submit" state={sending ? "loading" : "idle"}>
                  {sending ? (
                    t.sending
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <IconSend size={16} stroke={1.8} />
                      {t.submit}
                    </span>
                  )}
                </AuthButton>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
