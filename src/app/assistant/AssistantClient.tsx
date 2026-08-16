"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { getAssistantReply } from "./actions";

const AI_ASSISTANT_SUGGESTIONS = [
  "Which vendors need attention today?",
  "Summarize this month's settlements",
  "Which vendors are close to their break-even order volume?",
  "How many applications are pending review?",
];

type Message = { role: "user" | "assistant"; content: string };

export function AssistantClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(text: string) {
    if (!text.trim() || pending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setPending(true);
    try {
      const reply = await getAssistantReply(text);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong answering that — try again." }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeader title="AI Assistant" description="Ask questions about vendors, applications, and platform revenue — grounded in real platform data." />

      <Card className="flex h-[70vh] flex-col p-0">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "var(--accent-gradient)" }}>
                <Sparkles size={18} className="text-black" />
              </div>
              <p className="mt-3 max-w-sm text-sm text-[var(--text-muted)]">
                This assistant can only answer questions — it can&apos;t change anything for you.
              </p>
              <div className="mt-5 flex max-w-md flex-wrap justify-center gap-2">
                {AI_ASSISTANT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "text-black" : "bg-[var(--surface-hover)] text-[var(--text)]"
                }`}
                style={m.role === "user" ? { background: "var(--accent-gradient)" } : undefined}
              >
                {m.content}
              </div>
            </motion.div>
          ))}

          {pending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-[var(--surface-hover)] px-4 py-2.5 text-sm text-[var(--text-faint)]">Thinking…</div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-[var(--border)] p-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about vendors, applications, revenue…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)]"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black disabled:opacity-50"
            style={{ background: "var(--accent-gradient)" }}
            aria-label="Send"
          >
            <Send size={15} />
          </button>
        </form>
      </Card>
    </div>
  );
}
