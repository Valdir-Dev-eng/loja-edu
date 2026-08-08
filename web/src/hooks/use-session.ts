"use client";

import { useContext } from "react";
import { SessionContext } from "@/context/session-context";

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession precisa ser usado dentro de um SessionProvider.");
  }
  return context;
}
