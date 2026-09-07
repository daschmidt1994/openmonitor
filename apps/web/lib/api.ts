"use client";

import { OpenMonitorClient, type AuthTokens } from "@openmonitor/api-client";

const REFRESH_STORAGE_KEY = "openmonitor.refreshToken";

let inMemoryTokens: AuthTokens | null = null;
let listeners: Array<(tokens: AuthTokens | null) => void> = [];

function loadInitialTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const refreshToken = window.localStorage.getItem(REFRESH_STORAGE_KEY);
  if (!refreshToken) return null;
  // accessToken starts empty; the client's automatic-refresh-on-401 will
  // mint a fresh one on the first authenticated request.
  return { accessToken: "", refreshToken, accessTokenExpiresIn: "" };
}

export function getTokens(): AuthTokens | null {
  if (inMemoryTokens === null) inMemoryTokens = loadInitialTokens();
  return inMemoryTokens;
}

export function setTokens(tokens: AuthTokens | null): void {
  inMemoryTokens = tokens;
  if (typeof window !== "undefined") {
    if (tokens?.refreshToken) window.localStorage.setItem(REFRESH_STORAGE_KEY, tokens.refreshToken);
    else window.localStorage.removeItem(REFRESH_STORAGE_KEY);
  }
  listeners.forEach((l) => l(tokens));
}

export function onTokensChanged(listener: (tokens: AuthTokens | null) => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export const apiClient = new OpenMonitorClient({
  baseUrl: API_BASE_URL,
  getTokens,
  setTokens,
});
