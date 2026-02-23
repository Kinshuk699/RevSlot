import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <p className="text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-zinc-100 underline-offset-4 hover:underline">
            Sign in
          </Link>
          .
        </p>
        <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
      </div>
    </main>
  );
}
