"use client";

import { ReactNode } from "react";
import { CartProvider } from "@/context/cart-context";
import { NotificationProvider } from "@/context/notification-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationStack } from "./notification-stack";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <NotificationProvider>
        <CartProvider>
          {children}
          <NotificationStack />
        </CartProvider>
      </NotificationProvider>
    </TooltipProvider>
  );
}
