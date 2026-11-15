import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react";

import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import useAccountContext from "./useAccountContext";
import { auth } from "./firebaseConfig";
import { formatRelativeTime } from "./timeFormat";
import { chatNotice, maskContactInfo } from "./contactGuard";
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
import { t, tv } from "./i18n";

const TOPIC_LABEL = { listing: "Listing", order: "Order", demand: "Bulk request" }; // shown through tv()
const TOPIC_LINK = {
  listing: ["/dashboard", { page: "prices" }],
  order: ["/track-orders"],
  demand: ["/demand-board"],
};

function Thread({ conversation, me, onBack }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const otherName = conversation.names?.[otherParticipant(conversation, me.uid)] || t("common.member");

  useEffect(
    () => subscribeMessages(conversation.id, setMessages, (error) => toast.error(t("messages.couldNotLoad", { error: error.message }))),
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
      toast.error(
        error.code === "permission-denied"
          ? t("messages.thatMessageCanBeSentPhone")
          : error.message
      );
    } finally {
      setSending(false);
    }
  };

  const topic = conversation.topic || {};
  const link = TOPIC_LINK[topic.kind];

  return (
    <section className="msg-thread aaf-card" aria-label={t("messages.conversationWith", { name: otherName })}>
      <header className="msg-thread-head">
        <button type="button" className="msg-back" onClick={onBack} aria-label={t("messages.backToAllConversations")}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <strong>{otherName}</strong>
          <span>
            {tv(TOPIC_LABEL[topic.kind]) || t("messages.about")}: {topic.title || "-"}
          </span>
        </div>
        {link && (
          <button
            type="button"
            className="aaf-btn aaf-btn-secondary aaf-btn-sm"
            onClick={() => navigate(link[0], link[1] ? { state: link[1] } : undefined)}
          >
            {{ listing: t("messages.viewListing"), order: t("messages.viewOrder"), demand: t("messages.viewRequest") }[topic.kind]}
          </button>
        )}
      </header>

      <p className="msg-notice">
        <ShieldCheck size={15} aria-hidden="true" /> {chatNotice()}
      </p>

      <div className="msg-scroll" aria-live="polite">
        {messages === null && <p className="aaf-empty">{t("common.loading")}</p>}
        {messages && messages.length === 0 && (
          <p className="aaf-empty">{t("messages.noMessagesYetAskAboutAvailability")}</p>
        )}
        {(messages || []).map((m) => (
          <div key={m.id} className={`msg-bubble ${m.senderId === me.uid ? "mine" : ""}`}>
            <p>{maskContactInfo(m.text)}</p>
            <time>{formatRelativeTime(toMillis(m.createdAt)) || "sending..."}</time>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="msg-compose" onSubmit={send}>
        <label htmlFor="msg-input" className="aaf-visually-hidden">
          {t("messages.messageName", { name: otherName })}
        </label>
        <textarea
          id="msg-input"
          rows={2}
          value={text}
          maxLength={MAX_MESSAGE}
          placeholder={t("messages.messageNameEllipsis", { name: otherName })}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
        />
        <button className="aaf-btn aaf-btn-primary" type="submit" disabled={sending || !text.trim()}>
          <Send size={15} aria-hidden="true" /> {t("common.send")}
        </button>
      </form>
    </section>
  );
}

export default function Messages() {
  const { theme, navSections, logout } = useAccountContext("/messages");
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const uid = user?.uid;
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

  const me = { uid, name: user?.displayName || user?.email || t("common.member") };

  return (
    <AppShell
      eyebrow={t("messages.account")}
      title={t("messages.messages")}
      subtitle={t("messages.privateConversationsWithTheBuyersAnd")}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      <div className={`msg-layout ${open ? "has-open" : ""}`}>
        <section className="msg-list aaf-card" aria-label={t("messages.conversations")}>
          {loadError && <p className="aaf-empty">{t("messages.couldNotLoadYours", { error: loadError })}</p>}
          {!loadError && conversations === null && <p className="aaf-empty">{t("common.loading")}</p>}
          {conversations && conversations.length === 0 && (
            <p className="aaf-empty">
              {t("messages.noConversationsYetUseMessageSeller")}
            </p>
          )}
          <ul>
            {(conversations || []).map((c) => {
              const unread = isUnread(c, uid);
              const name = c.names?.[otherParticipant(c, uid)] || t("common.member");
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
                      {TOPIC_LABEL[c.topic?.kind] || t("messages.about")}: {c.topic?.title}
                    </span>
                    <span className="msg-row-last">
                      {unread && <span className="msg-dot" aria-label={t("messages.unread")} />}
                      {c.lastMessage ? maskContactInfo(c.lastMessage) : t("messages.noMessagesYet")}
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
              {conversationId && conversations ? t("messages.thisConversationCouldNotBeFound") : t("messages.chooseConversationToReadIt")}
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
