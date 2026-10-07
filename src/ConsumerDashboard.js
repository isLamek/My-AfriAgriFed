import React, {
  useState,
  useEffect,
  useMemo
} from "react";

import {
  collection,
  doc,
  getDoc,
  onSnapshot
} from "firebase/firestore";

import {
  ref,
  push,
  query,
  orderByChild,
  limitToLast,
  onValue,
  set,
  remove
} from "firebase/database";

import { signOut } from "firebase/auth";

import {
  db,
  auth,
  database
} from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinairyUpload";
import { getAdminProfile } from "./admin";
import NotificationBell from "./NotificationBell";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import { startCheckout } from "./payments";
import toast from "react-hot-toast";
import { buildNavSections } from "./navConfig";
import { useLocation, useNavigate } from "react-router-dom";
import CommunitySpaces from "./CommunitySpaces";
import ListingCard from "./ListingCard";
import { chatWith } from "./chat";
import { checkForContactInfo, maskContactInfo } from "./contactGuard";

import AppShell from "./AppShell";
import {
  Heart,
  MessageCircle,
  Send,
  Trash2,
  ImagePlus,
  X,
  Sparkles,
  Clock,
} from "lucide-react";

import "./ConsumerDashboard.css";
import { MemberAvatar } from "./Avatar";

// One place to stop contact details before anything is posted publicly.
const blockedContact = (text) => {
  const result = checkForContactInfo(text);
  if (result.ok) return false;
  toast.error(result.message);
  return true;
};

const MAX_POST_LENGTH = 500;
const FEED_WINDOW = 60; // most recent N posts pulled from Realtime DB

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const diffMs = Date.now() - timestamp;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Lightweight engagement ranking (freshness decay + likes/comments weight) -
// a "For You" feed without needing a follow graph or ML infra. "Recent"
// stays a plain reverse-chronological option alongside it.
function scorePost(post) {
  const likeCount = post.likes ? Object.keys(post.likes).length : 0;
  const commentCount = post.comments ? Object.keys(post.comments).length : 0;
  const ageHours = Math.max(0, (Date.now() - (post.createdAt || 0)) / 3600000);
  return (likeCount * 2 + commentCount * 3 + 1) / Math.pow(ageHours + 2, 1.5);
}

export default function ConsumerDashboard({ role = "consumer" }) {

  const location = useLocation();
  const navigate = useNavigate();
  // Other pages (the Demand Board, the sidebar) can ask for a specific tab.
  const [selectedPage, setSelectedPage] = useState(location.state?.page === "prices" ? "prices" : "feed");
  const [feedMode, setFeedMode] = useState("forYou"); // forYou | recent

  const [posts, setPosts] = useState([]);
  const [prices, setPrices] = useState([]);

  const [marketSearch, setMarketSearch] = useState("");

  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);

  const [commentText, setCommentText] = useState({});
  const [replyText, setReplyText] = useState({});
  const [openReplyKey, setOpenReplyKey] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [orgProfile, setOrgProfile] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    getAdminProfile(auth.currentUser).then((profile) => setIsAdminUser(!!profile));

    if (role !== "consumer") return;

    getDoc(doc(db, "users", uid)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const isOrganization =
        data.isOrganization === true ||
        (!!data.questionnaireData?.consumerType && data.questionnaireData.consumerType !== "Individual Buyer");

      if (isOrganization) {
        setOrgProfile({
          consumerType: data.questionnaireData?.consumerType || "Organization",
          businessName: data.questionnaireData?.businessName || "",
        });
      }
    });
  }, [role]);

  const authorRoleLabel = role === "farmer" ? "Farmer" : orgProfile ? "Organization" : "Consumer";

  /*
  ==================================
  REAL TIME POSTS - windowed to the most recent FEED_WINDOW so this
  doesn't load the entire post history on every visit as the community grows.
  ==================================
  */

  useEffect(() => {
    const postsQuery = query(ref(database, "posts"), orderByChild("createdAt"), limitToLast(FEED_WINDOW));

    const unsubscribe = onValue(postsQuery, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setPosts([]);
        return;
      }

      const postsArray = Object.entries(data).map(
        ([id, post]) => ({
          id,
          ...post
        })
      );

      setPosts(postsArray);
    });

    return () => unsubscribe();
  }, []);

  const rankedPosts = useMemo(() => {
    const copy = [...posts];
    if (feedMode === "recent") {
      copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      copy.sort((a, b) => scorePost(b) - scorePost(a));
    }
    return copy;
  }, [posts, feedMode]);

  /*
  ==================================
  REAL TIME PRICES
  ==================================
  */

  useEffect(() => {

    const unsubscribe = onSnapshot(
      collection(db, "marketPrices"),
      (snapshot) => {

        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPrices(data);
      }
    );

    return () => unsubscribe();

  }, []);

  /*
  ==================================
  CREATE POST
  ==================================
  */
  const handleImageSelect = (file) => {
    setSelectedImage(file || null);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const createPost = async () => {

    if ((!postText.trim() && !selectedImage) || posting)
      return;
    if (blockedContact(postText)) return;

    setPosting(true);

    try {

      let imageUrl = "";

      if (selectedImage) {

        const result =
          await uploadToCloudinary(
            selectedImage,
            "posts"
          );

        imageUrl = result.secure_url;
      }

      await push(
        ref(database, "posts"),
        {
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || auth.currentUser.email,
          authorRole: authorRoleLabel,
          content: postText.trim(),
          imageUrl,
          comments: {},
          createdAt: Date.now()
        }
      );

      setPostText("");
      handleImageSelect(null);
      logTelemetryEvent(TELEMETRY_EVENTS.POST_CREATED, {});

    } catch (error) {

      console.error(error);

      toast.error(
        "Failed to upload post: " +
        error.message
      );
    } finally {
      setPosting(false);
    }
  };

  /*
  ==================================
  LIKE / DELETE
  ==================================
  */
  const toggleLike = async (post) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const likeRef = ref(database, `posts/${post.id}/likes/${uid}`);
    try {
      if (post.likes?.[uid]) {
        await remove(likeRef);
      } else {
        await set(likeRef, true);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deletePost = async (post) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await remove(ref(database, `posts/${post.id}`));
      toast.success("Post deleted.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  /*
  ==================================
  ADD COMMENT
  ==================================
  */
  const addComment = async (postId) => {
    if (!commentText[postId]?.trim()) return;
    if (blockedContact(commentText[postId])) return;

    const commentsRef = ref(
      database,
      `posts/${postId}/comments`
    );

    const newCommentRef = push(commentsRef);

    try {
      await set(newCommentRef, {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        text: commentText[postId].trim(),
        createdAt: Date.now()
      });

      setCommentText(prev => ({
        ...prev,
        [postId]: ""
      }));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deleteComment = async (postId, commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await remove(ref(database, `posts/${postId}/comments/${commentId}`));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const addReply = async (postId, commentId) => {
    const key = `${postId}_${commentId}`;
    if (!replyText[key]?.trim()) return;
    if (blockedContact(replyText[key])) return;

    try {
      await set(push(ref(database, `posts/${postId}/comments/${commentId}/replies`)), {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        text: replyText[key].trim(),
        createdAt: Date.now(),
      });

      setReplyText((prev) => ({ ...prev, [key]: "" }));
      setOpenReplyKey(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deleteReply = async (postId, commentId, replyId) => {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await remove(ref(database, `posts/${postId}/comments/${commentId}/replies/${replyId}`));
    } catch (error) {
      toast.error(error.message);
    }
  };


  /*
  ==================================
  LOGOUT
  ==================================
  */

  const logout = async () => {

    logTelemetryEvent(TELEMETRY_EVENTS.LOG_OUT, {});
    await signOut(auth);

    window.location.href = "/";
  };

  const navSections = buildNavSections({
    userType: role,
    isAdmin: isAdminUser,
    activePath: "/dashboard",
    onFeedClick: () => setSelectedPage("feed"),
    onMarketplaceClick: () => setSelectedPage("prices"),
  }).map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.label === "Community Feed") return { ...item, active: selectedPage === "feed" };
      if (item.label === "Marketplace") return { ...item, active: selectedPage === "prices" };
      return item;
    }),
  }));

  return (
    <AppShell
      eyebrow={
        role === "farmer"
          ? "Producer workspace"
          : orgProfile
          ? `${orgProfile.businessName} · ${orgProfile.consumerType}`
          : "Consumer workspace"
      }
      title={selectedPage === "prices" ? "Marketplace" : "Community Feed"}
      subtitle={
        selectedPage === "prices"
          ? "Ready-to-sell listings from producers across Namibia."
          : "Share news, photos, tips and questions with the community."
      }
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={role === "farmer" ? "farmer" : orgProfile ? "organization" : "consumer"}
    >

      <CommunitySpaces
        active={selectedPage === "prices" ? "market" : "feed"}
        userType={role}
        onSelect={(space) => {
          if (space.id === "feed") { setSelectedPage("feed"); return true; }
          if (space.id === "market") { setSelectedPage("prices"); return true; }
          return false;
        }}
      />

      {/* CREATE POST */}

      {selectedPage === "feed" && (
      <div className="create-post aaf-card">

        <h2>Share with the community</h2>
        <p className="create-post-hint">
          For news, photos, tips and questions. Need a bulk quantity of something?{" "}
          <button type="button" className="create-post-link" onClick={() => navigate("/demand-board")}>
            Post it on the Demand Board
          </button>{" "}
          so producers can pledge to supply it.
        </p>

        <textarea
          placeholder="What's happening on your farm or in your market?"
          value={postText}
          maxLength={MAX_POST_LENGTH}
          onChange={(e) =>
            setPostText(e.target.value)
          }
        />
        <div className="create-post-charcount">
          {postText.length}/{MAX_POST_LENGTH}
        </div>

        {imagePreview && (
          <div className="create-post-preview">
            <img src={imagePreview} alt="Selected" />
            <button type="button" onClick={() => handleImageSelect(null)} aria-label="Remove image">
              <X size={16} />
            </button>
          </div>
        )}

        <label className="create-post-file-btn">
          <ImagePlus size={16} /> {selectedImage ? "Change photo" : "Add a photo"}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e.target.files?.[0])}
            hidden
          />
        </label>

        <button className="aaf-btn aaf-btn-primary" onClick={createPost} disabled={posting}>
          {posting ? "Posting..." : "Post"}
        </button>

      </div>
      )}

      {/* MARKET PRICES */}

      {selectedPage === "prices" && (

        <div className="market-prices aaf-card">

          <div className="feed-header">
            <h2>Listings</h2>
            <input
              className="market-search"
              type="search"
              placeholder="Search products..."
              value={marketSearch}
              onChange={(e) => setMarketSearch(e.target.value)}
            />
          </div>

          {(() => {
            const filtered = prices.filter((price) =>
              price.product?.toLowerCase().includes(marketSearch.trim().toLowerCase())
            );

            if (prices.length === 0) {
              return <p className="dashboard-empty-state">No marketplace listings yet.</p>;
            }
            if (filtered.length === 0) {
              return <p className="dashboard-empty-state">No listings match "{marketSearch}".</p>;
            }

            return (
              <div className="market-grid">
                {filtered.map((price) => (
                  <ListingCard
                    key={price.id}
                    listing={price}
                    isOwn={price.sellerId === auth.currentUser?.uid}
                    onBuy={(listing, quantity) =>
                      startCheckout({ listingId: listing.id, quantity, product: listing.product, sellerId: listing.sellerId })
                    }
                    onMessage={(listing) =>
                      chatWith(navigate, {
                        otherId: listing.sellerId,
                        otherName: listing.sellerName,
                        topic: { kind: "listing", id: listing.id, title: listing.product, ownerId: listing.sellerId },
                      })
                    }
                  />
                ))}
              </div>
            );
          })()}

        </div>
      )}

      {/* POSTS */}

      {selectedPage === "feed" && (

        <div className="posts-section aaf-card">

          <div className="feed-header">
            <h2>Latest posts</h2>
            <div className="feed-mode-toggle">
              <button
                className={feedMode === "forYou" ? "active" : ""}
                onClick={() => setFeedMode("forYou")}
              >
                <Sparkles size={14} /> For You
              </button>
              <button
                className={feedMode === "recent" ? "active" : ""}
                onClick={() => setFeedMode("recent")}
              >
                <Clock size={14} /> Recent
              </button>
            </div>
          </div>

          {rankedPosts.length === 0 ? (
            <p className="dashboard-empty-state">No posts yet. Be the first to share something.</p>
          ) : (
          rankedPosts.map(post => {
            const uid = auth.currentUser?.uid;
            const liked = !!post.likes?.[uid];
            const likeCount = post.likes ? Object.keys(post.likes).length : 0;
            const commentList = post.comments
              ? Object.entries(post.comments).map(([id, comment]) => ({ id, ...comment }))
              : [];
            // Realtime Database rules only allow the post's own author to
            // delete it (no admin cross-post override without mirroring
            // admin uids into RTDB, which isn't wired up) - keep this in
            // sync with database.rules.json.
            const canDelete = post.userId === uid;

            return (
           <div
  key={post.id}
  className="post-card"
>
  <div className="post-header">
    <MemberAvatar uid={post.userId} name={post.userName} size={36} className="post-avatar" />
    <div className="post-header-text">
      <h4>
        {post.userName}
        {post.authorRole && <span className="post-role-badge">{post.authorRole}</span>}
      </h4>
      <span className="post-time">{formatRelativeTime(post.createdAt)}</span>
    </div>
    {canDelete && (
      <button className="post-delete-btn" onClick={() => deletePost(post)} aria-label="Delete post">
        <Trash2 size={15} />
      </button>
    )}
  </div>

  {post.content && <p>{maskContactInfo(post.content)}</p>}

  {/* DISPLAY IMAGE */}

  {post.imageUrl && (
    <img
      src={post.imageUrl}
      alt="Post"
      className="post-image"
      loading="lazy"
    />
  )}

  {/* LIKE / COMMENT BAR */}
  <div className="post-actions">
    <button className={`post-action-btn ${liked ? "liked" : ""}`} onClick={() => toggleLike(post)}>
      <Heart size={16} fill={liked ? "currentColor" : "none"} /> {likeCount > 0 ? likeCount : "Like"}
    </button>
    <span className="post-action-btn static">
      <MessageCircle size={16} /> {commentList.length > 0 ? commentList.length : "Comment"}
    </span>
  </div>

  {/* COMMENTS */}

  <div className="comments">

   {commentList.map((comment) => {
     const replyKey = `${post.id}_${comment.id}`;
     const replies = comment.replies
       ? Object.entries(comment.replies).map(([id, reply]) => ({ id, ...reply }))
       : [];

     return (
     <div key={comment.id} className="comment-thread">
       <div className="comment">
         <MemberAvatar uid={comment.userId} name={comment.userName || comment.userId} size={28} className="comment-avatar" />
         <div className="comment-body">
           <strong>{comment.userName || "Member"}</strong>
           <p>{maskContactInfo(comment.text)}</p>
           <div className="comment-actions">
             <button onClick={() => setOpenReplyKey(openReplyKey === replyKey ? null : replyKey)}>
               Reply
             </button>
             {comment.userId === auth.currentUser?.uid && (
               <button onClick={() => deleteComment(post.id, comment.id)} className="comment-delete">
                 Delete
               </button>
             )}
           </div>

           {replies.length > 0 && (
             <div className="comment-replies">
               {replies.map((reply) => (
                 <div key={reply.id} className="comment reply">
                   <MemberAvatar uid={reply.userId} name={reply.userName || reply.userId} size={28} className="comment-avatar" />
                   <div className="comment-body">
                     <strong>{reply.userName || "Member"}</strong>
                     <p>{maskContactInfo(reply.text)}</p>
                     {reply.userId === auth.currentUser?.uid && (
                       <div className="comment-actions">
                         <button onClick={() => deleteReply(post.id, comment.id, reply.id)} className="comment-delete">
                           Delete
                         </button>
                       </div>
                     )}
                   </div>
                 </div>
               ))}
             </div>
           )}

           {openReplyKey === replyKey && (
             <div className="comment-input-row reply-input-row">
               <input
                 type="text"
                 placeholder={`Reply to ${comment.userName || "this comment"}...`}
                 value={replyText[replyKey] || ""}
                 onChange={(e) => setReplyText((prev) => ({ ...prev, [replyKey]: e.target.value }))}
                 onKeyDown={(e) => {
                   if (e.key === "Enter") addReply(post.id, comment.id);
                 }}
                 autoFocus
               />
               <button onClick={() => addReply(post.id, comment.id)} aria-label="Send reply">
                 <Send size={14} />
               </button>
             </div>
           )}
         </div>
       </div>
     </div>
     );
   })}
    <div className="comment-input-row">
      <input
        type="text"
        placeholder="Write a comment..."
        value={commentText[post.id] || ""}
        onChange={(e) =>
          setCommentText(prev => ({
            ...prev,
            [post.id]: e.target.value
          }))
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") addComment(post.id);
        }}
      />

      <button
        onClick={() =>
          addComment(post.id)
        }
        aria-label="Send comment"
      >
        <Send size={15} />
      </button>
    </div>

  </div>

</div>
            );
          }))}

        </div>
      )}

    </AppShell>
  );

}
