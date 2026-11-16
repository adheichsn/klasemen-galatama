import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import LoginForm from "@/components/login-form";
export const dynamic = "force-dynamic";
export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");
  return <LoginForm />;
}
