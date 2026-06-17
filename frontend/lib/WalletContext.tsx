"use client";

import { createContext, useCallback, useContext, useState } from "react";
import useSWR from "swr";
import { connectWallet, disconnectWallet } from "./wallet";
import { fetchXlmBalance } from "./balance";
import type { AppError } from "./types";

interface WalletState {
  address: string | null;
  balance: string | null;
  connecting: boolean;
  error: AppError | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const { data: balance } = useSWR(
    address ? ["balance", address] : null,
    () => fetchXlmBalance(address as string),
    { refreshInterval: 8000 },
  );

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    const result = await connectWallet();
    setConnecting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setAddress(result.address);
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        balance: balance ?? null,
        connecting,
        error,
        connect,
        disconnect,
        clearError: () => setError(null),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
