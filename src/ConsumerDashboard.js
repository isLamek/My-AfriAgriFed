import React, {
  useState,
  useEffect
} from "react";

import {
  collection,
  onSnapshot
} from "firebase/firestore";

import {
  ref,
  push,
  onValue,
  set
} from "firebase/database";

import { signOut } from "firebase/auth";

import {
  db,
  auth,
  database
} from "./firebaseConfig";
import { uploadToCloudinary }
from "./cloudinairyUpload";
import NotificationBell from "./NotificationBell";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import { startCheckout } from "./payments";
import toast from "react-hot-toast";
import { buildNavSections } from "./navConfig";
import AppShell from "./AppShell";

import "./ConsumerDashboard.css";

export default function ConsumerDashboard({ dashboardTitle = "Consumer Dashboard", role = "consumer" }) {

  const [selectedPage, setSelectedPage] = useState("feed");

  const [posts, setPosts] = useState([]);
  const [prices, setPrices] = useState([]);

  const [postText, setPostText] = useState("");

  const [commentText, setCommentText] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);


  /*
  ==================================
  REAL TIME POSTS
  ==================================
  */

useEffect(() => {
  const postsRef = ref(database, "posts");

  const unsubscribe = onValue(postsRef, (snapshot) => {
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

    postsArray.sort(
      (a, b) => b.createdAt - a.createdAt
    );

    setPosts(postsArray);
  });

  return () => unsubscribe();
}, []);

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
const createPost = async () => {

  if (!postText && !selectedImage)
    return;

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
        userName: auth.currentUser.email,
        content: postText,
        imageUrl,
        comments: {},
        createdAt: Date.now()
      }
    );

    setPostText("");
    setSelectedImage(null);
    logTelemetryEvent(TELEMETRY_EVENTS.POST_CREATED, {});

  } catch (error) {

    console.error(error);

    toast.error(
      "Failed to upload post: " +
      error.message
    );
  }
};
  /*
  ==================================
  ADD COMMENT
  ==================================
  */
const addComment = async (postId) => {
  if (!commentText[postId]) return;

  const commentsRef = ref(
    database,
    `posts/${postId}/comments`
  );

  const newCommentRef = push(commentsRef);

  await set(newCommentRef, {
    userId: auth.currentUser.uid,
    text: commentText[postId],
    createdAt: Date.now()
  });

  setCommentText(prev => ({
    ...prev,
    [postId]: ""
  }));
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
    isAdmin: false,
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
      eyebrow={role === "farmer" ? "Producer workspace" : "Consumer workspace"}
      title={dashboardTitle}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
    >

      {/* CREATE POST */}

      <div className="create-post aaf-card">

        <h2>Create Post</h2>

        <textarea
          placeholder="Share something..."
          value={postText}
          onChange={(e) =>
            setPostText(e.target.value)
          }
        />
        <input
            type="file"
            accept="image/*"
        onChange={(e) =>
         setSelectedImage(e.target.files[0])
            }
        />

        <button className="aaf-btn aaf-btn-primary" onClick={createPost}>
          Post
        </button>

      </div>

      {/* MARKET PRICES */}

      {selectedPage === "prices" && (

        <div className="market-prices aaf-card">

          <h2>Marketplace</h2>

          {prices.length === 0 ? (
            <p className="dashboard-empty-state">No marketplace listings yet.</p>
          ) : (
          prices.map(price => (

            <div
              key={price.id}
              className="price-card"
            >

              <h3>{price.product}</h3>

              <p>
                N${price.price}
                {price.unit && <span className="price-unit"> / {price.unit}</span>}
              </p>

              {price.sellerName && <p className="price-seller">Sold by {price.sellerName}</p>}

              <button
                className="buy-btn"
                disabled={!price.sellerSubaccountId}
                onClick={() =>
                  startCheckout({
                    product: price.product,
                    price: price.price,
                    sellerId: price.sellerId,
                    sellerSubaccountId: price.sellerSubaccountId,
                    sellerName: price.sellerName,
                  })
                }
                title={price.sellerSubaccountId ? "" : "This seller hasn't set up payouts yet"}
              >
                Buy
              </button>

            </div>

          )))}

        </div>
      )}

      {/* POSTS */}

      {selectedPage === "feed" && (

        <div className="posts-section aaf-card">

          <h2>Community Feed</h2>

          {posts.length === 0 ? (
            <p className="dashboard-empty-state">No posts yet. Be the first to share something.</p>
          ) : (
          posts.map(post => (

           <div
  key={post.id}
  className="post-card"
>
<h4>{post.userName}</h4>
  <p>{post.content}</p>

  {/* DISPLAY IMAGE */}

  {post.imageUrl && (
    <img
      src={post.imageUrl}
      alt="Post"
      className="post-image"
      loading="lazy"
    />
  )}

  {/* COMMENTS */}

  <div className="comments">

    <h4>Comments</h4>

   {post.comments &&
  Object.values(post.comments).map(
    (comment, index) => (
     <div
  key={index}
  className="comment"
>
  <strong>{comment.userId}</strong>
  <p>{comment.text}</p>
</div>
    )
)}
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
    />

    <button
      onClick={() =>
        addComment(post.id)
      }
    >
      Comment
    </button>

  </div>

</div>

          )))}

        </div>
      )}

    </AppShell>
  );

}
