import { Suspense } from "react";
import { AccountGate } from "@/components/account/account-gate";
import { AccountLoading } from "@/components/account/account-loading";

export default function ContaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AccountLoading />}>
      <AccountGate>{children}</AccountGate>
    </Suspense>
  );
}
