"use client";

import { use, useEffect, useState } from "react";
import PostCard, { Post } from "@/components/PostCard";
import { Avatar } from "@/components/Navbar";
import { formatRelative } from "@/lib/time";

interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
}

interface Me {
  id: number;
  username: string;
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Load current user
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMe(data))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    // Load profile
    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setProfile(data);
        setLoading(false);
      });
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    // Load user posts
    fetch(`/api/users/${encodeURIComponent(username)}/posts`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts);
        setNextCursor(data.nextCursor);
      });
  }, [username, profile]);

  async function loadMore() {
    if (!nextCursor) return;
    const res = await fetch(
      `/api/users/${encodeURIComponent(username)}/posts?cursor=${encodeURIComponent(nextCursor)}`
    );
    const data = await res.json();
    setPosts((prev) => [...prev, ...data.posts]);
    setNextCursor(data.nextCursor);
  }

  async function toggleFollow() {
    if (!profile) return;
    setFollowLoading(true);
    const method = profile.isFollowing ? "DELETE" : "POST";
    const res = await fetch(`/api/users/${encodeURIComponent(username)}/follow`, {
      method,
    });
    if (res.ok) {
      const data = await res.json();
      setProfile((prev) =>
        prev
          ? { ...prev, isFollowing: data.isFollowing, followerCount: data.followerCount }
          : prev
      );
    }
    setFollowLoading(false);
  }

  function handleDelete(id: number) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">Loading profile…</div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="text-center py-20 space-y-2">
        <div className="text-5xl">🌊</div>
        <p className="text-gray-700 font-semibold">User not found</p>
        <p className="text-gray-400 text-sm">@{username} doesn&rsquo;t exist.</p>
      </div>
    );
  }

  const isOwnProfile = me?.username === profile.username;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar url={profile.avatarUrl} name={profile.displayName} size={72} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {profile.displayName}
            </h1>
            <p className="text-gray-500">@{profile.username}</p>
            {profile.bio && (
              <p className="text-gray-700 text-sm mt-2 leading-relaxed">
                {profile.bio}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Joined {formatRelative(profile.createdAt)}
            </p>
          </div>
          {!isOwnProfile && me && (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                profile.isFollowing
                  ? "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {followLoading
                ? "…"
                : profile.isFollowing
                ? "Unfollow"
                : "Follow"}
            </button>
          )}
          {isOwnProfile && (
            <a
              href="/settings"
              className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Edit profile
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm text-gray-500 border-t border-gray-100 pt-4">
          <div className="text-center">
            <p className="font-bold text-gray-900 text-base">{profile.postCount}</p>
            <p>Posts</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900 text-base">{profile.followerCount}</p>
            <p>Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900 text-base">{profile.followingCount}</p>
            <p>Following</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      <h2 className="text-lg font-bold text-gray-900">Posts</h2>

      {posts.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">📝</div>
          <p className="text-gray-400 text-sm">No posts yet.</p>
        </div>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={{ ...post, isOwn: isOwnProfile }}
          onDelete={handleDelete}
        />
      ))}

      {nextCursor && (
        <button
          onClick={loadMore}
          className="w-full bg-white border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
}
