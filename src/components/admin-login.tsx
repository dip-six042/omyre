"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/admin";

export function AdminLogin() {
  const [error, action, pending] = useActionState(login, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4 text-plum">
      <form action={action} className="w-full max-w-sm border border-beige bg-cream px-6 py-8">
        <p className="text-[10px] tracking-[0.28em] text-gold uppercase">Omyre Essentials</p>
        <h1 className="mt-2 font-serif text-3xl">Admin</h1>
        <label className="mt-8 block text-sm">
          <span className="mb-1.5 block text-plum/60">Password</span>
          <input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full border border-beige bg-ivory px-3 py-3 outline-none focus:border-plum"
          />
        </label>
        {error && <p className="mt-3 text-sm text-rose">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full bg-plum py-3.5 text-[11px] tracking-[0.22em] text-cream uppercase transition duration-200 hover:bg-[#3a1f33] disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
