"use client";

/**
 * Frontend-only persistence for the demo: a "Nashemann platform account" is
 * completely separate from a vendor's own store admin login (theaamghar-
 * admin-style) -- this is the identity used for tracking an application,
 * the support chat, and submitting/viewing bug reports on nashemann.store
 * itself. Mirrors vendor-storefronts's real customer account system, minus a
 * real backend.
 */

export type PlatformAccount = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  provider: "email" | "google";
  createdAt: string;
};

const KEY = "nashemann_accounts";
const SESSION_KEY = "nashemann_session";

function readAccounts(): PlatformAccount[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PlatformAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: PlatformAccount[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(accounts));
}

export function getAllAccounts(): PlatformAccount[] {
  return readAccounts();
}

export function getAccountByEmail(email: string): PlatformAccount | null {
  return readAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function signUp(name: string, email: string, provider: PlatformAccount["provider"] = "email", phone?: string): PlatformAccount {
  const accounts = readAccounts();
  let account = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!account) {
    account = { id: `acc${Date.now()}`, name, email, phone, provider, createdAt: new Date().toISOString() };
    accounts.unshift(account);
    writeAccounts(accounts);
  }
  setSession(account.id);
  return account;
}

/** Real "log in to an existing account" semantics -- unlike signUp(), this never creates one. */
export function logIn(email: string): PlatformAccount | null {
  const account = readAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (account) setSession(account.id);
  return account ?? null;
}

export function setSession(accountId: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, accountId);
}

export function clearSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
}

export function getCurrentAccount(): PlatformAccount | null {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return readAccounts().find((a) => a.id === id) ?? null;
}

export function updateAccountEmail(accountId: string, newEmail: string) {
  const accounts = readAccounts();
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return null;
  accounts[idx] = { ...accounts[idx], email: newEmail };
  writeAccounts(accounts);
  return accounts[idx];
}
