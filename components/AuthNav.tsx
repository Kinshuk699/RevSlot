"use client";

import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
} from "@clerk/nextjs";

export function AuthNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3 sm:px-8 lg:px-10">
        <Link href="/" className="text-sm font-semibold tracking-wide text-zinc-100">
          RevSlot
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500"
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500"
          >
            Dashboard
          </Link>

          <SignedOut>
            <SignInButton mode="redirect">
              <button className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:border-zinc-500">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-white">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <SignOutButton>
              <button className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-white">
                Sign Out
              </button>
            </SignOutButton>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
