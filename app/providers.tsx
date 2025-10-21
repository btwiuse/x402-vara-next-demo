"use client";

import React from "react";
import { AccountProvider } from "@gear-js/react-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@gear-js/vara-ui/dist/style.css";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AccountProvider appName="x402-vara demo">
        {children}
      </AccountProvider>
    </QueryClientProvider>
  );
}
