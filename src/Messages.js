import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Send } from "lucide-react";

import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import useAccountContext from "./useAccountContext";
import { formatRelativeTime } from "./Feed";
import {
  MAX_MESSAGE,
  isUnread,
  markRead,
  otherParticipant,
  sendMessage,
  subscribeConversations,
  subscribeMessages,
  toMillis,
} from "./conversations";
import "./Messages.css";

const TOPIC_LABEL = { listing: "Listing", order: "Order", demand: "Bulk request" };
const TOPIC_LINK = { listing: "/marketplace", order: "/orders", demand: "/demand-board" };

function Thread({ conversation, me, onBack }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const otherName = conversation.names?.[otherParticipant(conversation, me.uid)] || "Member";

  useEffect(
    () => subscribeMessages(conversation.id, setMessages, (error) => toast.error(`Could not load messages: ${error.message}`)),
    [conversation.id]
  );

  // Opening a thread (or a new message arriving while it is open) marks it read.
  useEffect(() => {
    if (isUnread(conversation, me.uid)) markRead(conversation, me.uid);
  }, [conversation, me.uid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    if (sending || !text.trim()) return;
    setSending(true);
    try {
      await sendMessage(conversation, { uid: me.uid, name: me.name }, text);
      setText("");
    } catch (error) {
      toast.error(error.code === "permission-denied" ? "You can't send messages in this conversation." : error.message);
    } finally {
      setSending(false);
    }
  };

  const topic = conversation.topic || {};

  return (
    <section className="msg-thread" aria-label={`Conversation with ${otherName}`}>
      <header className="msg-thread-head">
        <button type="button" className="msg-back" onClick={onBack} aria-label="Back to all conversations">
          <ArrowLeft size={18} />
        </button>
        <div>
          <strong>{otherName}</strong>
          <span>
            {TOPIC_LABEL[topic.kind] || "About"}: {topic.title || "—"}
          </span>
        </div>
        {TOPIC_LINK[topic.kind] && (
          <button type="button" className="aaf-btn aaf-btn-secondary aaf-btn-sm" onClick={() => navigate(TOPIC_LINK[topic.kind])}>
            View {TOPIC_LABEL[topic.kind].toLowerCase()}
          </button>
        )}
      </header>

      <div className="msg-scroll" aria-live="polite">
        {messages === null && <p className="aaf-empty">Loading…</p>}
        {messages && messages.length === 0 && (
          <p className="aaf-empty">
            No messages yet. Ask about availability, delivery or collection. Payment always happens on AfriAgriFed, never by
            bank transfer to someone you met here.
          </p>
        )}
        {(messages || []).map((m) => (
          <div key={m.id} className={`msg-bubble ${m.senderId === me.uid ? "mine" : ""}`}>
            <p>{m.text}</p>
            <time>{formatRelativeTime(toMillis(m.createdAt)) || "sending…"}</time>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="msg-compose" onSubmit={send}>
        <label htmlFor="msg-input" className="aaf-visually-hidden">
          Message {otherName}
        </label>
        <textarea
          id="msg-input"
          rows={2}
          value={text}
          maxLength={MAX_MESSAGE}
          placeholder={`Message ${otherName}…`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
        />
        <button className="aaf-btn aaf-btn-primary" type="submit" disabled={sending || !text.trim()}>
          <Send size={15} aria-hidden="true" /> Send
        </button>
      </form>
    </section>
  );
}

export default function Messages() {
  const account = useAccountContext("/messages");
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const uid = account.user?.uid;
  const [conversations, setConversations] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeConversations(uid, setConversations, (error) => setLoadError(error.message));
  }, [uid]);

  const open = useMemo(
    () => (conversations || []).find((c) => c.id === conversationId) || null,
    [conversations, conversationId]
  );

  const me = { uid, name: account.publicName };

  return (
    <AppShell
      title="Messages"
      subtitle="Private conversations with the buyers and sellers you deal with."
      navSections={account.navSections}
      headerRight={<NotificationBell />}
      onLogout={account.logout}
    >
      <div className={`msg-layout ${open ? "has-open" : ""}`}>
        <section className="msg-list aaf-card" aria-label="Conversations">
          {loadError && <p className="aaf-empty">Could not load your messages: {loadError}</p>}
          {!loadError && conversations === null && <p className="aaf-empty">Loading…</p>}
          {conversations && conversations.length === 0 && (
            <p className="aaf-empty">
              No conversations yet. Use “Message seller” on a listing, or “Message” on an order, to start one.
            </p>
          )}
          <ul>
            {(conversations || []).map((c) => {
              const unread = isUnread(c, uid);
              const name = c.names?.[otherParticipant(c, uid)] || "Member";
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`msg-row ${c.id === conversationId ? "on" : ""} ${unread ? "unread" : ""}`}
                    aria-current={c.id === conversationId ? "true" : undefined}
                    onClick={() => navigate(`/messages/${c.id}`)}
                  >
                    <span className="msg-row-top">
                      <strong>{name}</strong>
                      <time>{formatRelativeTime(toMillis(c.lastMessageAt || c.createdAt))}</time>
                    </span>
                    <span className="msg-row-topic">
                      {TOPIC_LABEL[c.topic?.kind] || "About"}: {c.topic?.title}
                    </span>
                    <span className="msg-row-last">
                      {unread && <span className="msg-dot" aria-label="Unread" />}
                      {c.lastMessage || "No messages yet"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {open ? (
          <Thread key={open.id} conversation={open} me={me} onBack={() => navigate("/messages")} />
        ) : (
          <section className="msg-thread msg-placeholder aaf-card">
            <p className="aaf-empty">
              {conversationId && conversations ? "This conversation could not be found." : "Choose a conversation to read it."}
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
