"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { refresh } from "next/cache";
import { ordersCollection } from "@/lib/db";
import { createAdminSession, deleteAdminSession, isAdmin } from "@/lib/session";
import type { Order, OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = [
  "Pending",
  "Payment Pending",
  "Paid",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Returned",
];

function passwordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function login(_prev: string | null, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) {
    // Slow down password guessing.
    await new Promise((r) => setTimeout(r, 1000));
    return "Incorrect password.";
  }
  await createAdminSession();
  return null;
}

export async function logout() {
  await deleteAdminSession();
}

export async function getAdminOrders(): Promise<Order[]> {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  const orders = await ordersCollection();
  return orders.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (!(await isAdmin())) throw new Error("Unauthorized");
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  const orders = await ordersCollection();
  await orders.updateOne({ id: String(id) }, { $set: { status } });
  refresh();
}
