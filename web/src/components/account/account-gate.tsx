import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AccountShell } from "./account-shell";

export async function AccountGate({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  return <AccountShell user={user}>{children}</AccountShell>;
}
