import useSWR from "swr";
import { getEscrow } from "./soroban";

export function useEscrow(escrowId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    escrowId === null ? null : ["escrow", escrowId],
    () => getEscrow(escrowId as number),
    { refreshInterval: 4000, revalidateOnFocus: false },
  );

  return { escrow: data ?? null, error, isLoading, refresh: mutate };
}
