import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { chatWith } from "../chat";

/**
 * "Message the buyer / seller / carrier" about an order's delivery. Everyone involved talks inside the
 * app, so no phone numbers are shared. The carrier owns the conversation (their id is `ownerId`); the
 * rules let the buyer or the seller of that order, and nobody else, be on the other end.
 */
export default function ChatButton({ label, otherId, otherName, orderId, title, ownerId, className = "ot-btn" }) {
  const navigate = useNavigate();
  if (!otherId || !ownerId) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={() => chatWith(navigate, { otherId, otherName, topic: { kind: "delivery", id: orderId, title: title || "Delivery", ownerId } })}
    >
      <MessageCircle size={14} aria-hidden="true" /> {label}
    </button>
  );
}
