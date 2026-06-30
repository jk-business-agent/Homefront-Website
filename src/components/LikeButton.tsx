"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFavorites } from "@/lib/favorites-context";
import { useAuth } from "@/lib/auth-context";

// A heart toggle with a live like count. Works on cards (compact) and the
// product page (large).
export default function LikeButton({
  productId,
  likeCount,
  size = "sm",
  showCount = true,
}: {
  productId: string;
  likeCount: number;
  size?: "sm" | "lg";
  showCount?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { isLiked, toggle } = useFavorites();
  const liked = isLiked(productId);
  const [count, setCount] = useState(likeCount);
  const [busy, setBusy] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push("/login?next=/"); return; }
    if (busy) return;
    setBusy(true);
    // optimistic
    setCount((c) => c + (liked ? -1 : 1));
    const res = await toggle(productId);
    if (res) setCount(res.likeCount);
    setBusy(false);
  }

  return (
    <button
      className={`like-btn ${size} ${liked ? "liked" : ""}`}
      onClick={onClick}
      aria-label={liked ? "Unlike" : "Like"}
      title={liked ? "Liked" : "Like this"}
    >
      <span className="heart">{liked ? "❤️" : "🤍"}</span>
      {showCount && <span className="like-count">{count.toLocaleString()}</span>}
    </button>
  );
}
