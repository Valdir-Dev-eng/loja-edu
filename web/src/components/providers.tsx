"use client";

import { ReactNode } from "react";
import { CartProvider } from "@/context/cart-context";
import { NotificationProvider } from "@/context/notification-context";
import { NotificationStack } from "./notification-stack";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <CartProvider>
        {children}
        <NotificationStack />
      </CartProvider>
    </NotificationProvider>
  );
}
