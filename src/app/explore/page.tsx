"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PostCard, { Post } from "@/components/PostCard";

interface UserResult {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";

  const [q, setQ] = useState(initialQ);
  const [inputQ, setInputQ] = useState(initialQ);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState<"posts" | "people">(initialQ ? "people" : "posts");

  const loadPosts = useCallback(async (cursor?: string) => {
    const url = cursor
      ? `/api/posts/explore?cursor=${encodeURIComponent(cursor)}`
      : "/api/posts/explore";
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  }, []);

  useEffect(() => {
    loadPosts().then((data) => {
      if (data) {
        setPosts(data.posts);
        setNextCursor(data.nextCursor);
      }
      setLoading(false);
    });
  }, [loadPosts]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await loadPosts(nextCursor);
    if (data) {
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }

  async function searchUsers(query: string) {
    if (!query.trim()) {
      setUsers([]);
      return;
    }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputQ.trim();
    setQ(trimmed);
    if (trimmed) {
      router.push(`/explore?q=${encodeURIComponent(trimmed)}`, { scroll: false });
      setTab("people");
      searchUsers(trimmed);
    } else {
      router.push("/explore", { scroll: false });
      setUsers([]);
    }
  }

  useEffect(() => {
    if (!initialQ) return;
    fetch(`/api/users/search?q=${encodeURIComponent(initialQ)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setUsers(data.users);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Explore</h1>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Search people…"
          value={inputQ}
          onChange={(e) => setInputQ(e.target.value)}
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {(["posts", "people"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* People */}
      {tab === "people" && (
        <div className="space-y-3">
          {!q && (
            <p className="text-gray-400 text-sm">Search for people above.</p>
          )}
          {q && users.length === 0 && (
            <p className="text-gray-400 text-sm">No users found for &ldquo;{q}&rdquo;.</p>
          )}
          {users.map((u) => (
            <a
              key={u.id}
              href={`/profile/${u.username}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt={u.displayName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  u.displayName[0]?.toUpperCase() ?? "?"
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{u.displayName}</p>
                <p className="text-sm text-gray-500">@{u.username}</p>
                {u.bio && <p className="text-xs text-gray-400 truncate">{u.bio}</p>}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Posts */}
      {tab === "posts" && (
        <div className="space-y-4">
          {loading && (
            <div className="text-center py-12 text-gray-400">Loading posts…</div>
          )}
          {!loading && posts.length === 0 && (
            <div className="text-center py-12 text-gray-400">No posts yet.</div>
          )}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
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
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">Loading…</div>}>
      <ExploreContent />
    </Suspense>
  );
}
