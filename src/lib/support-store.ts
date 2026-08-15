"use client";

/**
 * Frontend-only persistence for the demo: support conversations live in
 * localStorage so the public /chat page's "talk to a human" messages
 * actually show up in the super-admin Support inbox in the same browser
 * session. Stands in for theaamghar-admin's real support_conversations +
 * support_messages tables + Realtime subscription.
 */

export type SupportMessage = {
  id: string;
  senderType: "customer" | "admin";
  body: string;
  createdAt: string;
};

export type SupportConversation = {
  id: string;
  name: string;
  email: string;
  status: "open" | "closed";
  adminUnread: boolean;
  messages: SupportMessage[];
};

const KEY = "nashemann_support_conversations";

const SEED: SupportConversation[] = [
  {
    id: "sc1",
    name: "Zainab Raza",
    email: "zainab@northernnuts.pk",
    status: "open",
    adminUnread: true,
    messages: [
      { id: "m1", senderType: "customer", body: "Hi, I applied 3 days ago and haven't heard back yet — is that normal?", createdAt: "2026-08-13T10:00:00Z" },
      { id: "m2", senderType: "customer", body: "Just want to make sure the application actually went through.", createdAt: "2026-08-13T10:01:00Z" },
    ],
  },
  {
    id: "sc2",
    name: "Owais Foodie Reviews",
    email: "owais@foodiereviews.pk",
    status: "closed",
    adminUnread: false,
    messages: [
      { id: "m3", senderType: "customer", body: "How soon after approval do I get my referral code?", createdAt: "2026-08-05T09:00:00Z" },
      { id: "m4", senderType: "admin", body: "Right away — it's on your influencer dashboard as soon as you log in.", createdAt: "2026-08-05T09:20:00Z" },
    ],
  },
];

function readAll(): SupportConversation[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return SEED;
  try {
    return JSON.parse(raw) as SupportConversation[];
  } catch {
    return SEED;
  }
}

function writeAll(conversations: SupportConversation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(conversations));
}

export function getConversations(): SupportConversation[] {
  return readAll();
}

export function getConversationByEmail(email: string): SupportConversation | null {
  return readAll().find((c) => c.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function getConversationById(id: string): SupportConversation | null {
  return readAll().find((c) => c.id === id) ?? null;
}

/** Starts a conversation (or reuses the existing one for this email) and appends a customer message. */
export function sendCustomerMessage(name: string, email: string, body: string): SupportConversation {
  const all = readAll();
  let convo = all.find((c) => c.email.toLowerCase() === email.toLowerCase());
  const message: SupportMessage = { id: `m${Date.now()}`, senderType: "customer", body, createdAt: new Date().toISOString() };

  if (!convo) {
    convo = { id: `sc${Date.now()}`, name, email, status: "open", adminUnread: true, messages: [message] };
    all.unshift(convo);
  } else {
    convo.messages.push(message);
    convo.status = "open";
    convo.adminUnread = true;
  }
  writeAll(all);
  return convo;
}

export function sendAdminMessage(conversationId: string, body: string): SupportConversation | null {
  const all = readAll();
  const convo = all.find((c) => c.id === conversationId);
  if (!convo) return null;
  convo.messages.push({ id: `m${Date.now()}`, senderType: "admin", body, createdAt: new Date().toISOString() });
  convo.adminUnread = false;
  writeAll(all);
  return convo;
}

export function markRead(conversationId: string) {
  const all = readAll();
  const convo = all.find((c) => c.id === conversationId);
  if (convo) {
    convo.adminUnread = false;
    writeAll(all);
  }
}

export function closeConversation(conversationId: string) {
  const all = readAll();
  const convo = all.find((c) => c.id === conversationId);
  if (convo) {
    convo.status = "closed";
    writeAll(all);
  }
}
