"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import { GeistSans } from "geist/font/sans";
import { motion, Variants } from "framer-motion";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconLoader2,
  IconShieldLock,
} from "@tabler/icons-react";

import "@/styles/admin-theme.css";
import "@/styles/admin-auth.css";

import { cn } from "@/utils/cn";
import { adminAr } from "@/lib/i18n/admin-ar";
import { createClient } from "@/lib/supabase/client";
import { AuthService, AuthError } from "@/lib/services/auth.service";
import { ThemeToggle } from "@/components/admin/design-system/ThemeToggle";

import { AuroraPanel } from "./AuroraPanel";
import { AuraWordmark } from "./AuraWordmark";
import { AuthCard } from "./AuthCard";
import { PasswordField } from "./PasswordField";
import { AuthButton } from "./AuthButton";

const t = adminAr.resetPassword;

type ScreenState = "checking" | "ready" | "submitting" | "success" | "error";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 120, damping: 16 },
  },
};

function errorMessageFor(code: AuthError["code"]): string {
  switch (code) {
    case "network":
      return t.errors.network;
    case "invalid_session":
      return t.errors.invalidSession;
    case "same_password":
      return t.errors.samePassword;
    case "weak_password":
      return t.errors.weakPassword;
    default:
      return t.errors.unknown;
  }
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [screenState, setScreenState] = useState<ScreenState>("checking");
  const [linkErrorMessage, setLinkErrorMessage] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [shakeCard, setShakeCard] = useState(false);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  // `/auth/confirm` already exchanged the emailed token_hash for a session (via
  // cookies) before redirecting here. A link-level failure (expired/invalid/
  // missing token) arrives as `?error=...` and never reaches that exchange, so
  // there's no session to check in that case.
  useEffect(() => {
    const linkError = searchParams.get("error");
    if (linkError) {
      setLinkErrorMessage(
        t.linkErrors[linkError as keyof typeof t.linkErrors] ?? t.linkErrors.invalid_link
      );
      setScreenState("error");
      return;
    }

    let cancelled = false;
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data.user) {
          setLinkErrorMessage(t.linkErrors.no_session);
          setScreenState("error");
          return;
        }
        setRecoveryEmail(data.user.email ?? null);
        setScreenState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLinkErrorMessage(t.errors.network);
        setScreenState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (screenState === "ready") newPasswordRef.current?.focus();
  }, [screenState]);

  const triggerShake = () => {
    setShakeCard(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(100);
    setTimeout(() => setShakeCard(false), 500);
  };

  const validate = () => {
    const next: { newPassword?: string; confirmPassword?: string } = {};
    if (!newPassword) next.newPassword = t.errors.passwordRequired;
    else if (newPassword.length < 8) next.newPassword = t.errors.passwordTooShort;

    if (!confirmPassword) next.confirmPassword = t.errors.confirmRequired;
    else if (newPassword && confirmPassword !== newPassword) next.confirmPassword = t.errors.passwordMismatch;

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) {
      triggerShake();
      return;
    }

    setScreenState("submitting");
    try {
      await AuthService.updatePasswordAfterRecovery(newPassword);
      setScreenState("success");
      toast.success(t.success);
      const supabase = createClient();
      await supabase.auth.signOut();
      setTimeout(() => {
        router.push("/admin/login?reason=password_reset");
      }, 1400);
    } catch (err) {
      triggerShake();
      const code = err instanceof AuthError ? err.code : "unknown";
      const message = errorMessageFor(code);
      setFormError(message);
      toast.error(message);

      if (code === "invalid_session") {
        setLinkErrorMessage(t.linkErrors.no_session);
        setScreenState("error");
      } else {
        setScreenState("ready");
      }
    }
  };

  const handleResend = async () => {
    if (!recoveryEmail) return;
    setResendState("sending");
    try {
      await AuthService.requestPasswordReset(recoveryEmail);
      setResendState("sent");
    } catch {
      toast.error(t.errors.network);
      setResendState("idle");
    }
  };

  if (screenState === "checking") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <IconLoader2 size={28} className="animate-spin text-[var(--admin-primary)]" />
        <p className="text-sm text-[var(--admin-text-muted)]">{t.verifying}</p>
      </div>
    );
  }

  if (screenState === "error") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className={cn("space-y-5", shakeCard && "aura-shake")}
      >
        <motion.div
          variants={itemVariants}
          role="alert"
          className="aura-pop flex items-start gap-2.5 rounded-[var(--admin-radius-md)] border p-3 text-[13px] font-medium"
          style={{
            color: "var(--admin-danger)",
            background: "var(--admin-danger-muted)",
            borderColor: "var(--admin-danger)",
          }}
        >
          <span className="mt-px shrink-0">
            <IconAlertCircle size={18} stroke={1.7} />
          </span>
          <span className="flex-1 leading-relaxed">{linkErrorMessage}</span>
        </motion.div>

        {recoveryEmail && (
          <motion.div variants={itemVariants}>
            <AuthButton
              type="button"
              state={resendState === "sending" ? "loading" : resendState === "sent" ? "success" : "idle"}
              onClick={handleResend}
            >
              {resendState === "sent" ? adminAr.forgotPasswordModal.success : t.requestNewLink}
            </AuthButton>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="text-center">
          <button
            type="button"
            onClick={() => router.push("/admin/login")}
            className="inline-flex items-center gap-1.5 rounded-[var(--admin-radius-sm)] text-[13px] font-semibold text-[var(--admin-primary)] underline-offset-4 transition-colors hover:text-[var(--admin-primary-hover)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
          >
            <IconArrowLeft size={15} stroke={2} />
            {t.backToLogin}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  const busy = screenState === "submitting" || screenState === "success";

  return (
    <motion.div
      animate={
        screenState === "success"
          ? { opacity: 0, scale: 0.95, filter: "blur(4px)" }
          : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className={cn("w-full", shakeCard && "aura-shake")}
    >
      <motion.form
        variants={containerVariants}
        initial="hidden"
        animate="show"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5"
      >
        {formError && (
          <motion.div
            variants={itemVariants}
            role="alert"
            className="aura-pop flex items-start gap-2.5 rounded-[var(--admin-radius-md)] border p-3 text-[13px] font-medium"
            style={{
              color: "var(--admin-danger)",
              background: "var(--admin-danger-muted)",
              borderColor: "var(--admin-danger)",
            }}
          >
            <span className="mt-px shrink-0">
              <IconAlertCircle size={18} stroke={1.7} />
            </span>
            <span className="flex-1 leading-relaxed">{formError}</span>
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <PasswordField
            ref={newPasswordRef}
            label={t.newPassword}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={fieldErrors.newPassword}
            disabled={busy}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <PasswordField
            label={t.confirmPassword}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            disabled={busy}
            detectCapsLock={false}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <AuthButton type="submit" state={screenState === "submitting" ? "loading" : screenState === "success" ? "success" : "idle"}>
            {screenState === "submitting" ? t.updating : screenState === "success" ? t.updated : t.submit}
          </AuthButton>
        </motion.div>

        {screenState === "success" && (
          <motion.p
            variants={itemVariants}
            className="text-center text-xs text-[var(--admin-text-subtle)]"
          >
            {t.successRedirect}
          </motion.p>
        )}
      </motion.form>
    </motion.div>
  );
}

export function ResetPasswordScreen() {
  return (
    <div
      className={`admin-theme ${GeistSans.variable} grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.1fr_1fr] relative overflow-hidden`}
    >
      <AuroraPanel />

      <main className="relative flex flex-col items-center justify-center bg-[var(--admin-bg-base)] px-5 py-10 sm:px-8 overflow-hidden z-10 w-full">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden select-none">
          <div
            className="aura-orb aura-orb--a"
            style={{
              width: "28rem",
              height: "28rem",
              insetInlineStart: "-8rem",
              top: "-8rem",
              background: "radial-gradient(circle at center, var(--admin-primary) 0%, transparent 68%)",
              opacity: 0.15,
            }}
          />
          <div
            className="aura-orb aura-orb--b"
            style={{
              width: "24rem",
              height: "24rem",
              insetInlineEnd: "-10rem",
              bottom: "-6rem",
              background: "radial-gradient(circle at center, var(--admin-accent) 0%, transparent 70%)",
              opacity: 0.12,
            }}
          />
        </div>

        <div className="absolute end-5 top-5 z-20">
          <ThemeToggle />
        </div>

        <div className="mb-8 lg:hidden z-20">
          <AuraWordmark />
        </div>

        <AuthCard className="z-20">
          <header className="mb-7">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--admin-radius-lg)] bg-[var(--admin-primary-muted)] text-[var(--admin-primary)]">
              <IconShieldLock size={22} stroke={1.8} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--admin-text-base)]">
              {t.title}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--admin-text-muted)]">{t.subtitle}</p>
          </header>

          <Suspense
            fallback={
              <div className="flex justify-center py-6">
                <IconLoader2 size={24} className="animate-spin text-[var(--admin-primary)]" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </AuthCard>

        <p className="mt-8 text-xs text-[var(--admin-text-subtle)] z-20 text-center">
          {adminAr.login.copyright}
        </p>
      </main>

      <Toaster
        position="top-left"
        richColors
        dir="rtl"
        toastOptions={{
          style: {
            background: "var(--admin-bg-card)",
            border: "1px solid var(--admin-border-base)",
            color: "var(--admin-text-base)",
          },
        }}
      />
    </div>
  );
}
