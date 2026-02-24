import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffeec] px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <p className="text-center text-sm text-black/50">Already have an account? Sign in below.</p>
        <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
      </div>
    </main>
  );
}
