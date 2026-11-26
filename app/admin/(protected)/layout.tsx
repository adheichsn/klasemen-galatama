import { ActionDialogProvider } from "@/components/ui/action-dialog";
import "@/styles/admin-interactions.css";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <ActionDialogProvider>{children}</ActionDialogProvider>;
}
