import { useCallback } from "react";
import type { Role } from "~/types";

export function useSupplierPermissions() {
  const can = useCallback(
    (action: "view" | "create" | "update" | "delete", feature: string) => {
      return action === "view" || action === "update";
    },
    []
  );

  const has = useCallback((feature: string) => {
    return false;
  }, []);

  const is = useCallback((role: Role) => {
    return false;
  }, []);

  const isOwner = useCallback(() => {
    return false;
  }, []);

  return {
    can,
    has,
    is,
    isOwner,
  };
}
