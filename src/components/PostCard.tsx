"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "./Navbar";
import { formatRelative } from "@/lib/time";

export interface Post {
  id: number;
  content: string;
  imageUrl: string;
  createdAt: string;
  author: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isOwn?: boolean;
}

interface Props {
  post: Post;
  onDelete?: (id: number) => void;
}

export default function PostCard({ post, onDelete }: Props) {
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likedByMe, setLikedByMe] = useState(post.likedByMe);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<
    Array<{
      id: number;
      content: string;
      createdAt: string;
      author: { username: string; displayName: string; avatarUrl: string };
    }>
  >([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function toggleLike() {
    const method = likedByMe ? "DELETE" : "POST";
    const res = await fetch(`/api/posts/${post.id}/like`, { method });
    if (res.ok) {
      const data = await res.json();
      setLikeCount(data.likeCount);
      setLikedByMe(data.likedByMe);
    }
  }

  async function loadComments() {
    const res = await fetch(`/api/posts/${post.id}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
    }
  }

  async function toggleComments() {
    if (!showComments) await loadComments();
    setShowComments((v) => !v);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [...prev, data]);
      setCommentCount((n) => n + 1);
      setNewComment("");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) onDelete?.(post.id);
  }

  return (
    <article className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={`/profile/${post.author.username}`}>
          <Avatar url={post.author.avatarUrl} name={post.author.displayName} size={40} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Link
              href={`/profile/${post.author.username}`}
              className="font-semibold hover:underline truncate"
            >
              {post.author.displayName}
            </Link>
            <Link
              href={`/profile/${post.author.username}`}
              className="text-gray-500 text-sm"
            >
              @{post.author.username}
            </Link>
          </div>
          <p className="text-xs text-gray-400">{formatRelative(post.createdAt)}</p>
        </div>
        {post.isOwn && (
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 ml-auto text-sm"
            title="Delete post"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">
        {post.content}
      </p>

      {/* Image */}
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt="Post image"
          className="rounded-lg w-full max-h-80 object-cover"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 text-sm text-gray-500 pt-1">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 hover:text-red-500 transition-colors ${likedByMe ? "text-red-500" : ""}`}
        >
          <span>{likedByMe ? "❤️" : "🤍"}</span>
          <span>{likeCount}</span>
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"
        >
          <span>💬</span>
          <span>{commentCount}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-100 pt-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <Link href={`/profile/${c.author.username}`}>
                <Avatar url={c.author.avatarUrl} name={c.author.displayName} size={28} />
              </Link>
              <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1">
                <span className="font-medium mr-1">{c.author.displayName}</span>
                <span className="text-gray-700">{c.content}</span>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Write a comment…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={300}
              className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-full hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
