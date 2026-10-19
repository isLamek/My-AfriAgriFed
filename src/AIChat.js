// The AAF Assistant, as the visitor sees it: a launcher in the bottom corner
// that opens a chat panel. Mounted once in App.js, so it is on every page.
//
// The model, the key and the system prompt all live on the backend
// (server/chat.js); this only sends the conversation and renders what streams
// back. With no backend configured the launcher does not render at all, rather
// than offering help that cannot answer.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, RotateCcw } from "lucide-react";
import { API_BASE_URL, backendConfigured } from "./apiBase";
import "./AIChat.css";

// Any component can open the chat: window.dispatchEvent(new Event(OPEN_CHAT_EVENT)).
// The home page's bot bubble uses this.
export const OPEN_CHAT_EVENT = "aaf:open-chat";

const STORAGE_KEY = "aaf.chat.history";
const MAX_INPUT = 2000;

const GREETING =
  "Hello, I am the AAF Assistant. \u{1F642} I can explain how AfriAgriFed works - listings, the Demand Board, " +
  "orders, payments, verification - and answer practical farming questions for Namibian conditions. " +
  "What do you need? \u{1F33F}";

// Deliberately the questions people actually arrive with.
const SUGGESTIONS = [
  "How do I sell my produce here?",
  "I need 200 kg of onions every month",
  "What does AfriAgriFed charge?",
  "Which crops suit my region?",
];

/** Conversation is kept for the tab only: a shared computer should not keep it. */
function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((m) => m && m.role && m.content) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
  } catch {
    // Private mode or a full quota: the chat still works, it just won't persist.
  }
}

/**
 * Renders the assistant's text. The model is asked for plain prose, but it
 * still reaches for "- " lists and **bold**, so handle those two and nothing
 * else - no HTML goes near dangerouslySetInnerHTML.
 */
function MessageText({ text }) {
  const blocks = String(text).split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim());
    const isList = lines.length > 1 && lines.every((l) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(l));

    if (isList) {
      return (
        <ul className="aaf-chat-list" key={bi}>
          {lines.map((line, li) => (
            <li key={li}>{inline(line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""))}</li>
          ))}
        </ul>
      );
    }
    return <p key={bi}>{inline(block)}</p>;
  });
}

function inline(text) {
  // **bold** only; everything else is shown as written.
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
    );
}

export default function AIChat({ userType }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  // The model's words arrive in bursts. "revealing" is true while the typewriter
  // is still catching up with what has already been received.
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  // The home page has its own bot in this corner and opens the chat itself,
  // so we do not stack a second launcher on top of it.
  const isHome = useLocation().pathname === "/";

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const abortRef = useRef(null);
  // target: everything received so far. shown: how much of it is on screen.
  const typerRef = useRef({ target: "", shown: 0, frame: 0, streamDone: false });

  // Opened from elsewhere in the app (the home page bot).
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

  useEffect(() => saveHistory(messages), [messages]);

  // Follow the reply as it streams in.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes, and focus goes back to the launcher rather than nowhere.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Stop a half-finished reply if the component goes away.
  useEffect(() => {
    const typer = typerRef.current;
    return () => {
      abortRef.current?.abort();
      if (typer.frame) cancelAnimationFrame(typer.frame);
    };
  }, []);

  /**
   * Reveals the reply the way a person types it, rather than in the bursts the
   * network delivers it in.
   *
   * The pace is set by how far behind we are: a couple of characters a frame
   * when we are nearly caught up, more when a big burst has just landed. That
   * keeps it looking like typing without ever falling behind the model - which
   * matters, because the answers now arrive in well under a second.
   */
  const startTyping = useCallback(() => {
    const typer = typerRef.current;
    if (typer.frame) return; // already running

    const instant = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      const t = typerRef.current;
      // Whole characters, not UTF-16 units: an emoji is two units, and stopping
      // between them would show a broken glyph for a frame.
      const chars = Array.from(t.target);
      const behind = chars.length - t.shown;

      if (behind > 0) {
        t.shown += instant ? behind : Math.max(2, Math.ceil(behind / 40));
        if (t.shown > chars.length) t.shown = chars.length;
        const sofar = chars.slice(0, t.shown).join("");
        setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: sofar }]);
      }

      // Done only once the stream has ended AND the screen has caught up.
      if (t.streamDone && t.shown >= chars.length) {
        t.frame = 0;
        setRevealing(false);
        return;
      }
      t.frame = requestAnimationFrame(tick);
    };

    setRevealing(true);
    typer.frame = requestAnimationFrame(tick);
  }, []);

  const send = useCallback(
    async (text) => {
      const question = text.trim().slice(0, MAX_INPUT);
      if (!question || streaming || revealing) return;

      setError("");
      setInput("");

      const history = [...messages, { role: "user", content: question }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setStreaming(true);

      if (typerRef.current.frame) cancelAnimationFrame(typerRef.current.frame);
      typerRef.current = { target: "", shown: 0, frame: 0, streamDone: false };

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history,
            context: { userType, page: window.location.pathname },
          }),
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 503) setUnavailable(true);
          throw new Error(body.message || "The assistant is temporarily unavailable.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";

        // Server-sent events: one {"delta": "..."} per fragment, "[DONE]" at the end.
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.delta) {
                answer += parsed.delta;
                // Hand it to the typewriter; it decides what is on screen.
                typerRef.current.target = answer;
                startTyping();
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue; // a split JSON object
              throw e;
            }
          }
        }

        if (!answer) throw new Error("The assistant did not reply. Please try again.");
      } catch (e) {
        if (e.name === "AbortError") return;
        // Stop mid-word rather than typing out a reply that was cut off.
        if (typerRef.current.frame) cancelAnimationFrame(typerRef.current.frame);
        typerRef.current.frame = 0;
        setRevealing(false);
        setError(e.message || "Something went wrong.");
        // Drop the empty assistant bubble so the error is the last thing shown.
        setMessages((prev) => (prev.at(-1)?.content === "" ? prev.slice(0, -1) : prev));
      } finally {
        // The network is done; the typewriter clears "revealing" once the screen
        // has caught up with it.
        typerRef.current.streamDone = true;
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, revealing, startTyping, userType]
  );

  const reset = () => {
    abortRef.current?.abort();
    if (typerRef.current.frame) cancelAnimationFrame(typerRef.current.frame);
    typerRef.current = { target: "", shown: 0, frame: 0, streamDone: false };
    setRevealing(false);
    setMessages([]);
    setError("");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear, or storage is blocked. Either way the chat is empty.
    }
    inputRef.current?.focus();
  };

  // No backend means no assistant; say nothing rather than offer a dead button.
  if (!backendConfigured()) return null;

  return (
    <>
      {!isHome && (
      <button
        ref={launcherRef}
        type="button"
        className="aaf-chat-launcher"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close the AAF Assistant" : "Open the AAF Assistant"}
      >
        {open ? <X size={20} strokeWidth={2} /> : <MessageCircle size={20} strokeWidth={2} />}
        {!open && <span className="aaf-chat-launcher-label">Ask AAF</span>}
      </button>
      )}

      {open && (
        <section className={`aaf-chat-panel${isHome ? " aaf-chat-panel-home" : ""}`} role="dialog" aria-label="AAF Assistant" aria-modal="false">
          <header className="aaf-chat-header">
            <div>
              <h2>AAF Assistant</h2>
              <p>Answers about the platform and about farming in Namibia</p>
            </div>
            <div className="aaf-chat-header-actions">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  launcherRef.current?.focus();
                }}
                aria-label="Close the AAF Assistant"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          </header>

          <div className="aaf-chat-log" ref={scrollRef} aria-live="polite" aria-atomic="false">
            {messages.length === 0 && (
              <>
                <div className="aaf-chat-msg assistant">
                  <p>{GREETING}</p>
                </div>
                <div className="aaf-chat-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} disabled={streaming || revealing || unavailable}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((m, i) => {
              // The caret belongs on the last reply, while it is still arriving.
              const typingHere =
                m.role === "assistant" && i === messages.length - 1 && (streaming || revealing) && !!m.content;
              return (
              <div key={i} className={`aaf-chat-msg ${m.role}${typingHere ? " typing" : ""}`}>
                {m.content ? (
                  <MessageText text={m.content} />
                ) : (
                  <span className="aaf-chat-typing" aria-label="The assistant is typing">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </div>
              );
            })}

            {error && <p className="aaf-chat-error">{error}</p>}
          </div>

          <form
            className="aaf-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label className="aaf-sr-only" htmlFor="aaf-chat-input">
              Your question for the AAF Assistant
            </label>
            <textarea
              id="aaf-chat-input"
              ref={inputRef}
              value={input}
              maxLength={MAX_INPUT}
              rows={1}
              placeholder={unavailable ? "The assistant is not switched on yet" : "Ask a question"}
              disabled={streaming || revealing || unavailable}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter makes a new line.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <button type="submit" disabled={!input.trim() || streaming || revealing || unavailable} aria-label="Send">
              <Send size={18} strokeWidth={2} />
            </button>
          </form>

          <div className="aaf-chat-footer">
            <p className="aaf-chat-note">
              The assistant cannot see your listings, orders or account, and can make mistakes. For account help,
              contact support.
            </p>
            {messages.length > 0 && (
              <button
                type="button"
                className="aaf-chat-clear"
                onClick={reset}
                title="Delete this conversation"
              >
                <RotateCcw size={13} strokeWidth={2} />
                Clear chat
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
