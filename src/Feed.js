import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, push, query, orderByChild, limitToLast, onValue, set, remove } from "firebase/database";
import toast from "react-hot-toast";
import { Heart, MessageCircle, Send, Trash2, ImagePlus, X } from "lucide-react";

import { database } from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinaryUpload";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import useAccountContext from "./useAccountContext";
import { demandLabelFor, roleLabel } from "./navConfig";
import "./Feed.css";

const MAX_POST_LENGTH = 500;
const FEED_WINDOW = 60; // most recent N posts pulled from the Realtime Database
const COMMENTS_SHOWN = 2; // older comments fold away behind "View all"

export function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(timestamp).toLocaleDateString("en-GB");
}

function initials(name) {
  const parts = String(name || "").replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

// Older posts stored the author's e-mail address as their name. Never show it.
const displayName = (name) => (!name || name.includes("@") ? "Member" : name);

// "Top" ranking: likes and comments count, but freshness decays them, so a
// busy post from last week does not sit above today's news forever.
function scorePost(post) {
  const likes = post.likes ? Object.keys(post.likes).length : 0;
  const comments = post.comments ? Object.keys(post.comments).length : 0;
  const ageHours = Math.max(0, (Date.now() - (post.createdAt || 0)) / 3600000);
  return (likes * 2 + comments * 3 + 1) / Math.pow(ageHours + 2, 1.5);
}

const countLabel = (n, none, one, many) => (n === 0 ? none : `${n} ${n === 1 ? one : many}`);

const toList = (obj) => (obj ? Object.entries(obj).map(([id, value]) => ({ id, ...value })) : []);
const byOldest = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);

function Avatar({ name, small }) {
  return (
    <span className={`feed-avatar ${small ? "small" : ""}`} aria-hidden="true">
      {initials(displayName(name))}
    </span>
  );
}

function Composer({ account, onPosted }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);

  const chooseImage = (file) => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(file || null);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if ((!text.trim() && !image) || posting) return;
    setPosting(true);
    try {
      let imageUrl = "";
      if (image) imageUrl = (await uploadToCloudinary(image, "posts")).secure_url;
      await push(ref(database, "posts"), {
        userId: account.user.uid,
        userName: account.publicName,
        authorRole: roleLabel(account),
        content: text.trim(),
        imageUrl,
        createdAt: Date.now(),
      });
      setText("");
      chooseImage(null);
      logTelemetryEvent(TELEMETRY_EVENTS.POST_CREATED, {});
      onPosted?.();
    } catch (error) {
      toast.error(`Your post was not shared: ${error.message}`);
    } finally {
      setPosting(false);
    }
  };

  return (
    <form className="aaf-card feed-composer" onSubmit={submit}>
      <label htmlFor="feed-composer-text" className="aaf-section-title">
        Share with the community
      </label>
      <textarea
        id="feed-composer-text"
        placeholder="News, a photo from the field, a tip or a question…"
        value={text}
        maxLength={MAX_POST_LENGTH}
        onChange={(e) => setText(e.target.value)}
        aria-describedby="feed-composer-help"
      />

      {preview && (
        <div className="feed-composer-preview">
          <img src={preview} alt="The photo you are about to post" />
          <button type="button" onClick={() => chooseImage(null)} aria-label="Remove photo">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="feed-composer-bar">
        <label className="aaf-btn aaf-btn-secondary aaf-btn-sm feed-file">
          <ImagePlus size={15} aria-hidden="true" /> {image ? "Change photo" : "Add photo"}
          <input type="file" accept="image/*" onChange={(e) => chooseImage(e.target.files?.[0])} />
        </label>
        <span className="feed-count" aria-live="polite">
          {text.length}/{MAX_POST_LENGTH}
        </span>
        <button className="aaf-btn aaf-btn-primary aaf-btn-sm" type="submit" disabled={posting || (!text.trim() && !image)}>
          {posting ? "Posting…" : "Post"}
        </button>
      </div>

      <p id="feed-composer-help" className="feed-help">
        The feed is for conversation, not sales. To sell, use{" "}
        {account.userType === "farmer" ? (
          <button type="button" className="feed-link" onClick={() => navigate("/my-listings")}>My listings</button>
        ) : (
          <button type="button" className="feed-link" onClick={() => navigate("/marketplace")}>the Marketplace</button>
        )}
        ; to buy in bulk, post on{" "}
        <button type="button" className="feed-link" onClick={() => navigate("/demand-board")}>
          {demandLabelFor(account.userType)}
        </button>
        .
      </p>
    </form>
  );
}

function Comment({ comment, uid, onReply, onDelete, children }) {
  return (
    <div className="feed-comment">
      <Avatar name={comment.userName} small />
      <div className="feed-comment-body">
        <p>
          <strong>{displayName(comment.userName)}</strong> {comment.text}
        </p>
        <div className="feed-comment-meta">
          <span>{formatRelativeTime(comment.createdAt)}</span>
          {onReply && (
            <button type="button" onClick={onReply}>
              Reply
            </button>
          )}
          {comment.userId === uid && (
            <button type="button" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function InlineInput({ placeholder, label, onSend, autoFocus, inputRef }) {
  const [value, setValue] = useState("");
  const send = async () => {
    if (!value.trim()) return;
    if (await onSend(value.trim())) setValue("");
  };
  return (
    <div className="feed-input-row">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        maxLength={500}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
      />
      <button type="button" onClick={send} aria-label={label} disabled={!value.trim()}>
        <Send size={14} />
      </button>
    </div>
  );
}

function Post({ post, account }) {
  const uid = account.user?.uid;
  const [showAll, setShowAll] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const commentInput = useRef(null);

  const liked = !!post.likes?.[uid];
  const likeCount = post.likes ? Object.keys(post.likes).length : 0;
  const comments = toList(post.comments).sort(byOldest);
  const shown = showAll ? comments : comments.slice(-COMMENTS_SHOWN);
  const author = { userId: uid, userName: account.publicName };

  const run = async (action, failure) => {
    try {
      await action();
      return true;
    } catch (error) {
      toast.error(`${failure}: ${error.message}`);
      return false;
    }
  };

  const toggleLike = () =>
    run(() => (liked ? remove(ref(database, `posts/${post.id}/likes/${uid}`)) : set(ref(database, `posts/${post.id}/likes/${uid}`), true)), "Could not update your like");

  const addComment = (text) =>
    run(() => set(push(ref(database, `posts/${post.id}/comments`)), { ...author, text, createdAt: Date.now() }), "Your comment was not posted");

  const addReply = (commentId, text) =>
    run(async () => {
      await set(push(ref(database, `posts/${post.id}/comments/${commentId}/replies`)), { ...author, text, createdAt: Date.now() });
      setReplyTo(null);
    }, "Your reply was not posted");

  const removeAt = (path, what) => window.confirm(`Delete this ${what}?`) && run(() => remove(ref(database, path)), `Could not delete the ${what}`);

  return (
    <article className="feed-post" aria-label={`Post by ${displayName(post.userName)}`}>
      <header className="feed-post-head">
        <Avatar name={post.userName} />
        <div className="feed-post-who">
          <strong>{displayName(post.userName)}</strong>
          <span>
            {post.authorRole ? `${post.authorRole === "Farmer" ? "Producer" : post.authorRole} · ` : ""}
            <time dateTime={post.createdAt ? new Date(post.createdAt).toISOString() : undefined}>{formatRelativeTime(post.createdAt)}</time>
          </span>
        </div>
        {post.userId === uid && (
          <button className="feed-icon-btn" onClick={() => removeAt(`posts/${post.id}`, "post")} aria-label="Delete your post">
            <Trash2 size={15} />
          </button>
        )}
      </header>

      {post.content && <p className="feed-post-text">{post.content}</p>}
      {post.imageUrl && (
        <img src={post.imageUrl} alt={`Photo shared by ${displayName(post.userName)}`} className="feed-post-image" loading="lazy" />
      )}

      <div className="feed-post-actions">
        <button className={`feed-action ${liked ? "liked" : ""}`} onClick={toggleLike} aria-pressed={liked}>
          <Heart size={16} fill={liked ? "currentColor" : "none"} aria-hidden="true" /> {countLabel(likeCount, "Like", "like", "likes")}
        </button>
        <button className="feed-action" onClick={() => commentInput.current?.focus()}>
          <MessageCircle size={16} aria-hidden="true" /> {countLabel(comments.length, "Comment", "comment", "comments")}
        </button>
      </div>

      <div className="feed-comments">
        {comments.length > COMMENTS_SHOWN && !showAll && (
          <button type="button" className="feed-link" onClick={() => setShowAll(true)}>
            View all {comments.length} comments
          </button>
        )}
        {shown.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            uid={uid}
            onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            onDelete={() => removeAt(`posts/${post.id}/comments/${comment.id}`, "comment")}
          >
            {toList(comment.replies)
              .sort(byOldest)
              .map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  uid={uid}
                  onDelete={() => removeAt(`posts/${post.id}/comments/${comment.id}/replies/${reply.id}`, "reply")}
                />
              ))}
            {replyTo === comment.id && (
              <InlineInput
                autoFocus
                label={`Send reply to ${displayName(comment.userName)}`}
                placeholder={`Reply to ${displayName(comment.userName)}…`}
                onSend={(text) => addReply(comment.id, text)}
              />
            )}
          </Comment>
        ))}
        <InlineInput inputRef={commentInput} label="Send comment" placeholder="Write a comment…" onSend={addComment} />
      </div>
    </article>
  );
}

export default function Feed() {
  const account = useAccountContext("/feed");
  const [posts, setPosts] = useState(null); // null while loading
  const [mode, setMode] = useState("top"); // top | latest

  useEffect(() => {
    const postsQuery = query(ref(database, "posts"), orderByChild("createdAt"), limitToLast(FEED_WINDOW));
    return onValue(
      postsQuery,
      (snapshot) => setPosts(toList(snapshot.val())),
      () => setPosts([])
    );
  }, []);

  const ranked = useMemo(() => {
    const copy = [...(posts || [])];
    copy.sort(mode === "latest" ? (a, b) => (b.createdAt || 0) - (a.createdAt || 0) : (a, b) => scorePost(b) - scorePost(a));
    return copy;
  }, [posts, mode]);

  return (
    <AppShell
      title="Community feed"
      subtitle="News, photos, tips and questions from producers and buyers across Namibia."
      navSections={account.navSections}
      headerRight={<NotificationBell />}
      onLogout={account.logout}
    >
      <div className="feed-layout">
        {account.user && <Composer account={account} onPosted={() => setMode("latest")} />}

        <section aria-labelledby="feed-posts-title">
          <div className="feed-toolbar">
            <h2 id="feed-posts-title" className="aaf-section-title">Posts</h2>
            <div className="aaf-segmented" role="group" aria-label="Sort posts">
              <button className={mode === "top" ? "on" : ""} aria-pressed={mode === "top"} onClick={() => setMode("top")}>
                Top
              </button>
              <button className={mode === "latest" ? "on" : ""} aria-pressed={mode === "latest"} onClick={() => setMode("latest")}>
                Latest
              </button>
            </div>
          </div>

          {posts === null && <p className="aaf-empty">Loading posts…</p>}
          {posts && ranked.length === 0 && <p className="aaf-empty">No posts yet. Start the conversation.</p>}
          {ranked.map((post) => (
            <Post key={post.id} post={post} account={account} />
          ))}
        </section>
      </div>
    </AppShell>
  );
}
