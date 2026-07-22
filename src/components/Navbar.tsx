"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface Me {
  username: string;
  displayName: string;
  avatarUrl: string;
}

export default function Navbar() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMe(data))
      .catch(() => setMe(null));
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQ.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQ.trim())}`);
      setSearchQ("");
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🦈</span>
          <span className="font-bold text-blue-600 text-lg hidden sm:block">
            WebShark
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search users…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="w-full bg-gray-100 rounded-full px-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </form>

        {/* Nav links */}
        <div className="flex items-center gap-3 ml-auto">
          <Link
            href="/feed"
            className="text-gray-600 hover:text-blue-600 text-sm font-medium hidden sm:block"
          >
            Feed
          </Link>
          <Link
            href="/explore"
            className="text-gray-600 hover:text-blue-600 text-sm font-medium hidden sm:block"
          >
            Explore
          </Link>

          {me ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full hover:bg-gray-100 px-2 py-1"
              >
                <Avatar url={me.avatarUrl} name={me.displayName} size={32} />
                <span className="text-sm font-medium hidden sm:block">
                  {me.displayName}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
                  <Link
                    href={`/profile/${me.username}`}
                    className="block px-4 py-2 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-full hover:bg-blue-700"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export function Avatar({
  url,
  name,
  size = 40,
}: {
  url: string;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];

  return (
    <div
      className={`${color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || "?"}
    </div>
  );
}
