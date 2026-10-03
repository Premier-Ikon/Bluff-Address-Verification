export type Address = {
  name: string;
  phone: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type FlagReason = {
  code: string;
  message: string;
  customerMessage: string;
  source: string;
};

export type CustomerCase = {
  orderNumber: string;
  customerName: string;
  currentAddress: Address;
  status: string;
  alreadySubmitted: boolean;
  responseType: "confirm" | "update" | null;
  submittedAddress: Address | null;
  flagReason?: FlagReason | null;
};

const API_URL = process.env.NEXT_PUBLIC_AV_API_URL || "";
const SESSION_KEY = "av_session_id";

export function getSessionId() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(SESSION_KEY) || "";
}

export function setSessionId(sessionId: string) {
  window.sessionStorage.setItem(SESSION_KEY, sessionId);
}

export function clearSessionId() {
  window.sessionStorage.removeItem(SESSION_KEY);
}

export async function api<T>(body: Record<string, unknown>): Promise<T> {
  if (!API_URL) throw new Error("Address verification API is not configured.");
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { ok?: boolean; success?: boolean; error?: string };
  if (!response.ok || payload.ok === false || payload.success === false) {
    throw new Error(payload.error || "Could not reach the verification service.");
  }
  return payload;
}

export function formatAddressLines(address?: Address | null) {
  if (!address) return [];
  return [
    address.name,
    address.company,
    address.address1,
    address.address2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country && address.country !== "US" ? address.country : "",
  ].filter(Boolean);
}
