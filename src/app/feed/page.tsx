"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PostCard, { Post } from "@/components/PostCard";
import CreatePost from "@/components/CreatePost";

interface Me {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export default function FeedPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => {
        if (!r.ok) router.push("/login");
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (data) setMe(data);
      });
  }, [router]);

  const loadPosts = useCallback(async (cursor?: string) => {
    const url = cursor ? `/api/posts?cursor=${encodeURIComponent(cursor)}` : "/api/posts";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    return data;
  }, []);

  useEffect(() => {
    loadPosts().then((data) => {
      if (data) {
        setPosts(
          data.posts.map((p: Post) => ({
            ...p,
            isOwn: me ? p.author.id === me.id : false,
          }))
        );
        setNextCursor(data.nextCursor);
      }
      setLoading(false);
    });
  }, [loadPosts, me]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await loadPosts(nextCursor);
    if (data) {
      setPosts((prev) => [
        ...prev,
        ...data.posts.map((p: Post) => ({
          ...p,
          isOwn: me ? p.author.id === me.id : false,
        })),
      ]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }

  function handleNewPost(post: unknown) {
    const p = post as Post;
    setPosts((prev) => [{ ...p, isOwn: true }, ...prev]);
  }

  function handleDelete(id: number) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  if (!me) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <CreatePost onPost={handleNewPost} />

      {loading && (
        <div className="text-center py-12 text-gray-400">Loading feed…</div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">🌊</div>
          <p className="text-gray-500 font-medium">Your feed is empty</p>
          <p className="text-gray-400 text-sm">
            Follow some people or create your first post!
          </p>
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} onDelete={handleDelete} />
      ))}

      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full bg-white border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
