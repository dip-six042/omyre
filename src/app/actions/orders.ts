"use server";

import { MongoServerError } from "mongodb";
import { ordersCollection } from "@/lib/db";
import { getProduct } from "@/lib/products";
import { NIGERIAN_STATES } from "@/lib/constants";
import type { CartItem, DeliveryOption, Order, PaymentMethod } from "@/lib/types";
import { generateOrderId, productPrice } from "@/lib/utils";

export type PlaceOrderInput = {
  items: CartItem[];
  customer: Order["customer"];
  delivery: DeliveryOption;
  payment: PaymentMethod;
};

export type PlaceOrderResult = { ok: true; order: Order } | { ok: false; error: string };

const DELIVERY: DeliveryOption[] = ["lagos", "nationwide"];
const PAYMENT: PaymentMethod[] = ["bank-transfer", "mobile", "cash"];

function text(value: unknown, max: number, required = true) {
  const s = typeof value === "string" ? value.trim().slice(0, max) : "";
  if (required && !s) throw new Error("Please fill in all required fields.");
  return s;
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

// Compare phone numbers by their last 10 digits so 0812… and +234812… match.
function samePhone(a: string, b: string) {
  const x = digits(a).slice(-10);
  const y = digits(b).slice(-10);
  return x.length >= 7 && x === y;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  try {
    const c = input?.customer ?? ({} as Order["customer"]);
    const customer: Order["customer"] = {
      fullName: text(c.fullName, 120),
      email: text(c.email, 200),
      phone: text(c.phone, 40),
      whatsapp: text(c.whatsapp, 40),
      address: text(c.address, 300),
      state: text(c.state, 40),
      city: text(c.city, 80),
      landmark: text(c.landmark, 200, false),
    };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      return { ok: false, error: "Please enter a valid email address." };
    }
    if (digits(customer.phone).length < 7 || digits(customer.whatsapp).length < 7) {
      return { ok: false, error: "Please enter a valid phone number." };
    }
    if (!NIGERIAN_STATES.includes(customer.state)) {
      return { ok: false, error: "Please choose a state." };
    }
    if (!DELIVERY.includes(input.delivery) || !PAYMENT.includes(input.payment)) {
      return { ok: false, error: "Please choose delivery and payment options." };
    }

    // Prices always come from the catalogue, never from the browser.
    const raw = Array.isArray(input.items) ? input.items.slice(0, 50) : [];
    const items: Order["items"] = [];
    for (const line of raw) {
      const product = getProduct(String(line?.slug));
      const quantity = Math.floor(Number(line?.quantity));
      if (!product || product.stock <= 0 || !(quantity > 0)) continue;
      items.push({
        slug: product.slug,
        quantity: Math.min(quantity, product.stock),
        name: product.name,
        price: productPrice(product),
        image: product.images[0],
      });
    }
    if (items.length === 0) {
      return { ok: false, error: "Your bag is empty or its items are no longer available." };
    }

    const orders = await ordersCollection();
    for (let attempt = 0; attempt < 5; attempt++) {
      const order: Order = {
        id: generateOrderId(),
        createdAt: new Date().toISOString(),
        items,
        subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        customer,
        delivery: input.delivery,
        payment: input.payment,
        status: "Payment Pending",
      };
      try {
        // insertOne adds _id to the object it is given, so insert a copy.
        await orders.insertOne({ ...order });
        return { ok: true, order };
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) continue;
        throw error;
      }
    }
    throw new Error("Could not generate a unique order ID");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Please")) {
      return { ok: false, error: error.message };
    }
    console.error("placeOrder failed", error);
    return {
      ok: false,
      error: "We couldn't place your order. Please try again or message us on WhatsApp.",
    };
  }
}

export type TrackedOrder = Pick<
  Order,
  "id" | "createdAt" | "items" | "subtotal" | "delivery" | "status"
>;

export async function trackOrder(id: string, contact: string): Promise<TrackedOrder | null> {
  const orderId = String(id ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const who = String(contact ?? "").trim();
  if (!/^OMY-\d{6}$/.test(orderId) || !who) return null;

  const orders = await ordersCollection();
  const order = await orders.findOne({ id: orderId }, { projection: { _id: 0 } });
  if (!order) return null;

  const { customer } = order;
  const matches =
    who.toLowerCase() === customer.email.toLowerCase() ||
    samePhone(who, customer.phone) ||
    samePhone(who, customer.whatsapp);
  if (!matches) return null;

  return {
    id: order.id,
    createdAt: order.createdAt,
    items: order.items,
    subtotal: order.subtotal,
    delivery: order.delivery,
    status: order.status,
  };
}
