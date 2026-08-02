import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginClient } from "./login-client";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect(user.onboardingCompleted ? "/" : "/onboarding");
  }

  return (
    <div className="mx-auto flex max-w-(--content-max-width) justify-center px-4 py-16 sm:px-6">
      <LoginClient />
    </div>
  );
}
