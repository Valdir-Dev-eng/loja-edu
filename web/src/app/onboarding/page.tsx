import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (user.onboardingCompleted) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <OnboardingClient />
    </div>
  );
}
