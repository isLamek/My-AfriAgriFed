import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { auth, db } from "./firebaseConfig";
import "./NotificationBell.css";

export default function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      setItems(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      );
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = items.filter((item) => !item.read).length;

  const openNotification = async (item) => {
    if (!item.read) {
      updateDoc(doc(db, "notifications", item.id), { read: true }).catch(() => {});
    }

    setOpen(false);

    if (item.link) navigate(item.link);
  };

  return (
    <div className="notification-bell" ref={boxRef}>
      <button
        className="bell-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="bell-dropdown">
          <h4>Notifications</h4>

          {items.length === 0 ? (
            <p className="bell-empty">No notifications yet.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className={`bell-item ${item.read ? "" : "unread"}`}
                onClick={() => openNotification(item)}
              >
                <strong>{item.title}</strong>
                {item.body && <span>{item.body}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
