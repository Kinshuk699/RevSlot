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
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#fffeec]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3 sm:px-8 lg:px-10">
        <Link href="/" className="font-['Space_Grotesk'] text-sm font-bold tracking-wide text-black">
          Rev<span className="text-[#36A64F]">Slot</span>
        </Link>

        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="redirect">
              <button className="rounded-md border border-black/10 px-3 py-1.5 font-['Space_Mono'] text-xs font-semibold uppercase tracking-wider text-black hover:border-black/30">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button className="rounded-md bg-[#36A64F] px-3 py-1.5 font-['Space_Mono'] text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#36A64F]/90">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <Link
              href="/create"
              className="rounded-md bg-[#36A64F] px-3 py-1.5 font-['Space_Mono'] text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#36A64F]/90 transition"
            >
              + Create
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-black/10 px-3 py-1.5 font-['Space_Mono'] text-xs font-medium uppercase tracking-wider text-black/70 hover:border-black/30"
            >
              Dashboard
            </Link>
            <SignOutButton>
              <button className="rounded-md border border-black/10 px-3 py-1.5 font-['Space_Mono'] text-xs font-semibold uppercase tracking-wider text-black hover:border-black/30">
                Sign Out
              </button>
            </SignOutButton>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
