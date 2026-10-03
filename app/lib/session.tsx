"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, clearSessionId, getSessionId, setSessionId, type CustomerCase } from "./api";

type SessionState = {
  loading: boolean;
  error: string;
  caseData: CustomerCase | null;
  sessionId: string;
  refresh: () => Promise<void>;
  adoptSession: (sessionId: string, caseData: CustomerCase) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [caseData, setCaseData] = useState<CustomerCase | null>(null);
  const [sessionId, setSession] = useState("");

  const refresh = useCallback(async () => {
    const existing = getSessionId();
    if (!existing) {
      setSession("");
      setCaseData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = await api<{ case: CustomerCase }>({ action: "getSessionCase", sessionId: existing });
      setSession(existing);
      setCaseData(payload.case);
    } catch (err) {
      clearSessionId();
      setSession("");
      setCaseData(null);
      setError(err instanceof Error ? err.message : "Session expired. Re-open your email link.");
    } finally {
      setLoading(false);
    }
  }, []);

  const adoptSession = useCallback((nextSession: string, nextCase: CustomerCase) => {
    setSessionId(nextSession);
    setSession(nextSession);
    setCaseData(nextCase);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<SessionState>(
    () => ({
      loading,
      error,
      caseData,
      sessionId,
      refresh,
      adoptSession,
    }),
    [loading, error, caseData, sessionId, refresh, adoptSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
