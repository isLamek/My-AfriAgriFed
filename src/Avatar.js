import React, { useEffect, useState } from "react";
import { getPublicProfile } from "./publicProfile";
import "./Avatar.css";

const COLORS = ["#044d3a", "#7bb141", "#c3602b", "#2f6fb0", "#7c4fd1", "#0f9488"];

export function avatarColor(name) {
  const str = name || "?";
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function initials(name) {
  if (!name) return "?";
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return name[0]?.toUpperCase() || "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/** A member's photo, or their initials on a colour picked from their name. */
export default function Avatar({ name, photoURL, size = 40, className = "" }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [photoURL]);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (photoURL && !broken) {
    return <img className={`aaf-avatar ${className}`} style={style} src={photoURL} alt="" onError={() => setBroken(true)} />;
  }
  return (
    <span className={`aaf-avatar ${className}`} style={{ ...style, background: avatarColor(name) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/** Looks up the member's public card (cached) and shows their photo. */
export function MemberAvatar({ uid, name, size, className }) {
  const [photo, setPhoto] = useState("");
  useEffect(() => {
    let live = true;
    getPublicProfile(uid).then((p) => live && setPhoto(p?.photoURL || ""));
    return () => {
      live = false;
    };
  }, [uid]);
  return <Avatar name={name} photoURL={photo} size={size} className={className} />;
}
