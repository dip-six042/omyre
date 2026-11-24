import type { Metadata } from "next";
import { getAdminOrders } from "@/app/actions/admin";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const orders = await getAdminOrders();
  return <AdminDashboard orders={orders} />;
}
