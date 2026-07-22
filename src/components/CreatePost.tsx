"use client";

import { useState } from "react";

interface Props {
  onPost: (post: unknown) => void;
  placeholder?: string;
}

export default function CreatePost({ onPost, placeholder }: Props) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImage, setShowImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const maxLen = 500;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || loading) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, imageUrl: imageUrl.trim() || undefined }),
    });

    setLoading(false);
    if (res.ok) {
      const post = await res.json();
      onPost(post);
      setContent("");
      setImageUrl("");
      setShowImage(false);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create post");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
    >
      <textarea
        placeholder={placeholder ?? "What's on your mind?"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={maxLen}
        rows={3}
        className="w-full resize-none bg-transparent outline-none text-gray-800 placeholder-gray-400"
      />
      {showImage && (
        <input
          type="url"
          placeholder="Image URL (optional)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImage((v) => !v)}
            className="text-gray-400 hover:text-blue-500 text-xl"
            title="Add image URL"
          >
            🖼️
          </button>
          <span className={`text-xs ${content.length > maxLen * 0.9 ? "text-orange-500" : "text-gray-400"}`}>
            {content.length}/{maxLen}
          </span>
        </div>
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="bg-blue-600 text-white font-medium text-sm px-4 py-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
