"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotifications } from "@/hooks/use-notifications";

function PostLoginRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotifications();

  useEffect(() => {
    if (!searchParams.has("onboardingPending")) {
      return;
    }
    const onboardingPending = searchParams.get("onboardingPending") === "true";
    if (onboardingPending) {
      router.replace("/onboarding");
      return;
    }
    notify({ type: "success", title: "Login realizado", message: "Bem-vindo(a) de volta à Sorofarma!" });
    router.replace("/");
  }, [router, searchParams, notify]);

  return null;
}

export function PostLoginRedirect() {
  return (
    <Suspense fallback={null}>
      <PostLoginRedirectInner />
    </Suspense>
  );
}
