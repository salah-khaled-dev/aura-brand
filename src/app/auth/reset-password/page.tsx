import type { Metadata } from "next";
import { ResetPasswordScreen } from "@/components/admin/auth/ResetPasswordScreen";

export const metadata: Metadata = {
  title: "إعادة تعيين كلمة المرور | AURA Admin",
  description: "إعادة تعيين كلمة المرور للوصول إلى لوحة تحكم أورا",
  robots: "noindex, nofollow",
};

export default function ResetPasswordPage() {
  return <ResetPasswordScreen />;
}
