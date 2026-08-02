import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  return <CheckoutClient />;
}
