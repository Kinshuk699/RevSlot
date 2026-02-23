import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { syncUserProfile } from "@/app/actions/sync-user";
import { AuthNav } from "@/components/AuthNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeSlot",
  description: "AI-Powered Visual Commerce",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const { userId } = await auth();

  if (userId) {
    try {
      await syncUserProfile(userId);
    } catch (error) {
      console.error("Failed to sync user profile", error);
    }
  }

  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {publishableKey ? (
          <ClerkProvider
            publishableKey={publishableKey}
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
          >
            <AuthNav />
            {children}
            <Toaster theme="dark" richColors closeButton />
          </ClerkProvider>
        ) : (
          <>
            <AuthNav />
            {children}
            <Toaster theme="dark" richColors closeButton />
          </>
        )}
      </body>
    </html>
  );
}
