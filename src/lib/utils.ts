import { BRAND } from "./constants";
import type { Product } from "./types";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function productPrice(product: Product) {
  return product.salePrice ?? product.price;
}

export function stockLabel(product: Product) {
  if (product.stock <= 0) return "Sold Out";
  if (product.stock <= product.lowStockThreshold) return "Low stock";
  return "In stock";
}

export function whatsappUrl(message: string) {
  return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function productWhatsappMessage(product: Product) {
  return `Hello Omyre Essentials, I'm interested in ordering the ${product.name}.`;
}

// Show just the scent ("A Thousand Wishes") when the name is scent + type; the card
// prints the type underneath. Generic names like "Women's Body Cream" stay whole.
export function editorialTitle(product: Product) {
  const scent = product.fragranceName;
  if (scent !== "Assorted" && product.name.startsWith(`${scent} `)) return scent;
  return product.name;
}

export function generateOrderId() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `OMY-${String(n).slice(-6)}`;
}

export function matchesQuery(product: Product, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    product.name,
    product.brand,
    product.category,
    product.fragranceName,
    product.fragranceFamily,
    product.type,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}
