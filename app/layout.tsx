import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Toaster } from "sonner";
import { syncUserProfile } from "@/app/actions/sync-user";
import { AuthNav } from "@/components/AuthNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "RevSlot — AI-Powered Visual Commerce",
  description:
    "Turn any video into a shoppable storefront. RevSlot\u2019s AI Director finds the perfect frame, seamlessly places your product, and generates a click-to-buy overlay — no editing skills needed.",
  openGraph: {
    title: "RevSlot — AI-Powered Visual Commerce",
    description:
      "Turn any video into a shoppable storefront with generative AI product placement.",
    url: "https://revslot.onrender.com",
    siteName: "RevSlot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RevSlot — AI-Powered Visual Commerce",
    description:
      "Turn any video into a shoppable storefront with generative AI product placement.",
  },
  icons: {
    icon: "/favicon.ico",
  },
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {publishableKey ? (
          <ClerkProvider
            publishableKey={publishableKey}
            signInFallbackRedirectUrl="/create"
            signUpFallbackRedirectUrl="/create"
          >
            <AuthNav />
            {children}
            <Toaster richColors closeButton />
          </ClerkProvider>
        ) : (
          <>
            <AuthNav />
            {children}
            <Toaster richColors closeButton />
          </>
        )}
      </body>
    </html>
  );
}
