"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
} from "@clerk/nextjs";

export function AuthNav() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/music/innerbloom.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#fffeec]/90 backdrop-blur">
      <div className="flex w-full items-center px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="font-['Space_Grotesk'] text-sm font-bold tracking-wide text-black">
          Rev<span className="text-[#36A64F]">Slot</span>
        </Link>

        {/* Auth buttons — centered-ish via ml-auto */}
        <div className="ml-auto flex items-center gap-2">
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

        {/* Music player — pinned far right, signed-in only */}
        <SignedIn>
          <button
            onClick={toggleMusic}
            className="ml-3 flex flex-col items-center gap-0.5 group shrink-0"
            aria-label={playing ? "Pause music" : "Play music"}
          >
            <img
              src="/music/innerbloomcover.jpg"
              alt="Innerbloom"
              className="h-8 w-8 rounded-md object-cover border border-black/10 group-hover:border-black/25 transition"
            />
            <span className="text-[8px] font-['Space_Mono'] uppercase tracking-wider text-black/40">
              {playing ? "Pause" : "Play"}
            </span>
          </button>
        </SignedIn>
      </div>
    </header>
  );
}
