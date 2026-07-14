"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import { GeistSans } from "geist/font/sans";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  IconMail,
  IconAlertCircle,
  IconClockExclamation,
  IconX,
  IconShieldLock,
} from "@tabler/icons-react";

import "@/styles/admin-theme.css";
import "@/styles/admin-auth.css";

import { cn } from "@/utils/cn";
import { adminAr } from "@/lib/i18n/admin-ar";
import { AuthService, AuthError } from "@/lib/services/auth.service";
import { ThemeToggle } from "@/components/admin/design-system/ThemeToggle";

import { AuroraPanel } from "./AuroraPanel";
import { AuraWordmark } from "./AuraWordmark";
import { AuthCard } from "./AuthCard";
import { AuthInput } from "./AuthInput";
import { PasswordField } from "./PasswordField";
import { AuthButton } from "./AuthButton";

const t = adminAr.login;

type ButtonState = "idle" | "loading" | "success";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
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
    case "invalid_credentials":
      return t.errors.invalidCredentials;
    case "account_inactive":
      return "هذا الحساب معطّل. تواصل مع مسؤول النظام.";
    case "not_authorized":
      return t.errors.notAuthorized;
    case "email_not_confirmed":
      return t.errors.emailNotConfirmed;
    case "network":
      return t.errors.network;
    case "session_expired":
      return t.sessionExpired;
    default:
      return t.errors.unknown;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [state, setState] = useState<ButtonState>("idle");
  const [buttonText, setButtonText] = useState(t.signIn);

  const [sessionExpired, setSessionExpired] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get("reason") === "session_expired") setSessionExpired(true);
    emailRef.current?.focus();
  }, [searchParams]);

  useEffect(() => {
    if (state === "idle") {
      setButtonText(t.signIn);
    } else if (state === "loading") {
      setButtonText("جاري التحقق من الهوية...");
      const t1 = setTimeout(() => {
        setButtonText("جاري تحضير لوحة التحكم...");
      }, 350);
      return () => clearTimeout(t1);
    } else if (state === "success") {
      setButtonText("تم التحقق بنجاح!");
    }
  }, [state]);

  const triggerShake = () => {
    setShakeCard(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(100);
    }
    setTimeout(() => setShakeCard(false), 500);
  };

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    // Identifier may be a username OR an email — only require it to be present.
    if (!email.trim()) next.email = t.errors.emailRequired;
    if (!password) next.password = t.errors.passwordRequired;
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSessionExpired(false);
    if (!validate()) {
      triggerShake();
      return;
    }

    setState("loading");
    try {
      await AuthService.signInWithPassword({ identifier: email, password, rememberMe });
      setState("success");
      toast.success(t.success);
      // Keep the success state on screen through the redirect to avoid any flash.
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 700);
    } catch (err) {
      triggerShake();
      const code = err instanceof AuthError ? err.code : "unknown";
      const message = errorMessageFor(code);
      setFormError(message);
      toast.error(message);
      setState("idle");
      if (code === "invalid_credentials") emailRef.current?.focus();
    }
  };

  return (
    <motion.div
      animate={
        state === "success"
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
        {sessionExpired && (
          <motion.div variants={itemVariants}>
            <Banner
              tone="warning"
              icon={<IconClockExclamation size={18} stroke={1.7} />}
              message={t.sessionExpired}
              onDismiss={() => setSessionExpired(false)}
            />
          </motion.div>
        )}

        {formError && (
          <motion.div variants={itemVariants}>
            <Banner
              tone="danger"
              icon={<IconAlertCircle size={18} stroke={1.7} />}
              message={formError}
            />
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <AuthInput
            ref={emailRef}
            label="اسم المستخدم أو البريد الإلكتروني"
            type="text"
            autoComplete="username"
            dir="ltr"
            className="text-start"
            leadingIcon={<IconMail size={18} stroke={1.6} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            disabled={state !== "idle"}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <PasswordField
            label={t.password}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            disabled={state !== "idle"}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center justify-between pt-0.5">
          <label className="group flex cursor-pointer items-center gap-2.5 select-none">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={state !== "idle"}
                className="sr-only"
              />
              <div
                className={cn(
                  "custom-checkbox",
                  rememberMe && "custom-checkbox-checked",
                  "group-focus-within:ring-2 group-focus-within:ring-[var(--admin-primary)] group-focus-within:ring-offset-1"
                )}
              >
                <svg
                  className="custom-checkbox-checkmark"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <span className="text-[13px] font-semibold text-[var(--admin-text-muted)] transition-colors group-hover:text-[var(--admin-text-base)]">
              {t.rememberMe}
            </span>
          </label>

          <button
            type="button"
            onClick={() => toast.info(t.forgotPasswordHint)}
            className="rounded-[var(--admin-radius-sm)] text-[13px] font-semibold text-[var(--admin-primary)] underline-offset-4 transition-colors hover:text-[var(--admin-primary-hover)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
          >
            {t.forgotPassword}
          </button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AuthButton type="submit" state={state}>
            {buttonText}
          </AuthButton>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="rounded-[var(--admin-radius-md)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-card)]/40 p-3 text-start">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--admin-text-base)] uppercase tracking-wider mb-2">
              <IconShieldLock size={14} className="text-[var(--admin-primary)] shrink-0" />
              <span>أمان المؤسسة (Enterprise Security)</span>
            </div>
            <ul className="space-y-1.5 text-[10.5px] text-[var(--admin-text-muted)] font-medium font-sans">
              <li className="flex items-center gap-2">
                <span className="text-[var(--admin-primary)] font-bold select-none">✓</span>
                <span>اتصال مشفّر وآمن بالكامل (Secure Session)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--admin-primary)] font-bold select-none">✓</span>
                <span>حماية ضد محاولات الاختراق (Brute-force Protection)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--admin-primary)] font-bold select-none">✓</span>
                <span>الوصول للموظفين المصرح لهم فقط (Protected Admin)</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </motion.form>
    </motion.div>
  );
}

function Banner({
  tone,
  icon,
  message,
  onDismiss,
}: {
  tone: "danger" | "warning";
  icon: React.ReactNode;
  message: string;
  onDismiss?: () => void;
}) {
  const color = tone === "danger" ? "danger" : "warning";
  return (
    <div
      role="alert"
      className="aura-pop flex items-start gap-2.5 rounded-[var(--admin-radius-md)] border p-3 text-[13px] font-medium"
      style={{
        color: `var(--admin-${color})`,
        background: `var(--admin-${color}-muted)`,
        borderColor: `var(--admin-${color})`,
      }}
    >
      <span className="mt-px shrink-0">{icon}</span>
      <span className="flex-1 leading-relaxed">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق"
          className="shrink-0 rounded-[var(--admin-radius-sm)] p-0.5 opacity-70 transition-opacity hover:opacity-100"
        >
          <IconX size={15} stroke={2} />
        </button>
      )}
    </div>
  );
}

interface RequestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function RequestAccessModal({ isOpen, onClose }: RequestAccessModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

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
            className="relative w-full max-w-[440px] rounded-[var(--admin-radius-2xl)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-card)] p-6 shadow-[var(--admin-shadow-2xl)] focus:outline-none z-10 font-sans"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="absolute end-4 top-4 rounded-[var(--admin-radius-sm)] p-1 text-[var(--admin-text-subtle)] transition-colors hover:text-[var(--admin-text-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
            >
              <IconX size={18} stroke={2} />
            </button>

            <div className="flex items-start gap-3.5 mb-5 mt-1 text-start">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--admin-radius-lg)] bg-[var(--admin-primary-muted)] text-[var(--admin-primary)]">
                <IconShieldLock size={20} stroke={1.8} />
              </span>
              <div>
                <h3 id="modal-title" className="text-base font-bold text-[var(--admin-text-base)]">
                  {t.requestAccessTitle}
                </h3>
                <p className="text-[10px] font-bold text-[var(--admin-primary)] mt-0.5 uppercase tracking-wider">
                  {t.restrictedTitle}
                </p>
              </div>
            </div>

            <div className="mb-5 text-start font-sans">
              <p className="text-xs text-[var(--admin-text-muted)] leading-relaxed bg-[var(--admin-bg-surface)] p-3.5 rounded-[var(--admin-radius-md)] border border-[var(--admin-border-base)]">
                {t.restrictedDesc}
              </p>
            </div>

            <div className="text-start">
              <h4 className="text-[11px] font-bold text-[var(--admin-text-base)] uppercase tracking-wider mb-3">
                🛡️ {t.upcomingFeatures}
              </h4>
              <ul className="space-y-2">
                {[
                  { label: t.mfa, icon: "🔐" },
                  { label: t.passkeys, icon: "🔑" },
                  { label: t.trustedDevices, icon: "💻" },
                  { label: t.loginHistory, icon: "📊" },
                  { label: t.securityAlerts, icon: "🔔" },
                ].map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2.5 rounded-[var(--admin-radius-md)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-surface)]/50 px-3 py-2 text-xs text-[var(--admin-text-muted)] opacity-60 select-none font-sans"
                  >
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <span className="flex-1 font-medium">{item.label}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-[var(--admin-bg-active)] px-1.5 py-0.5 rounded text-[var(--admin-text-subtle)] font-sans">
                      قريباً
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function LoginScreen() {
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  return (
    <div
      className={`admin-theme ${GeistSans.variable} grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.1fr_1fr] relative overflow-hidden`}
    >
      <AuroraPanel />

      <main className="relative flex flex-col items-center justify-center bg-[var(--admin-bg-base)] px-5 py-10 sm:px-8 overflow-hidden z-10 w-full">
        {/* Animated luxury background orbs and grid texture for mobile & desktop */}
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
          {/* Subtle mesh/sheen overlay */}
          <div
            className="aura-sheen absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage:
                "linear-gradient(var(--admin-border-base) 1px, transparent 1px), linear-gradient(90deg, var(--admin-border-base) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(circle at center, black, transparent 80%)",
              WebkitMaskImage: "radial-gradient(circle at center, black, transparent 80%)",
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
            <h2 className="text-2xl font-bold tracking-tight text-[var(--admin-text-base)]">
              {t.welcome}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--admin-text-muted)]">{t.cardSubtitle}</p>
          </header>

          <Suspense fallback={<FormSkeleton />}>
            <LoginForm />
          </Suspense>
        </AuthCard>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 100 }}
          className="mt-6 text-center z-20 animate-fade-in"
        >
          <span className="text-[13px] text-[var(--admin-text-subtle)] font-medium">
            {t.needAccess}{" "}
          </span>
          <button
            type="button"
            onClick={() => setShowRequestAccess(true)}
            className="text-[13px] font-semibold text-[var(--admin-primary)] hover:text-[var(--admin-primary-hover)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)] rounded-[var(--admin-radius-sm)] px-1 transition-colors"
          >
            {t.requestAccess}
          </button>
        </motion.div>

        <p className="mt-8 text-xs text-[var(--admin-text-subtle)] lg:hidden z-20 text-center">
          {t.copyright} تطوير:{" "}
          <a
            href="https://salahkhaled.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline transition-colors hover:text-[var(--admin-text-base)]"
          >
            Salah Khaled
          </a>
        </p>
      </main>

      <RequestAccessModal
        isOpen={showRequestAccess}
        onClose={() => setShowRequestAccess(false)}
      />

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

function FormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 rounded bg-[var(--admin-bg-active)]" />
          <div className="h-12 w-full rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-active)]" />
        </div>
      ))}
      <div className="h-12 w-full rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-active)]" />
    </div>
  );
}
