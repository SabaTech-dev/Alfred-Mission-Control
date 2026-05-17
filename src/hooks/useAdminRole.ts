"use client";

import { useState, useEffect } from "react";

/**
 * Client-side hook to check if the current user has admin role.
 * Reads the role from the auth_token cookie payload.
 */
export function useAdminRole(): { isAdmin: boolean; isLoading: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth_token="))
        ?.split("=")[1];

      if (!token) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const parts = token.split(".");
      if (parts.length !== 2) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const payloadB64 = parts[0];
      // base64url decode
      let base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";

      const payload = JSON.parse(atob(base64));
      setIsAdmin(payload.role === "admin");
    } catch {
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isAdmin, isLoading };
}
