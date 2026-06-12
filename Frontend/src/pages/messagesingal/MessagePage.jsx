import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { FiPlus, FiSearch, FiMessageSquare } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────────────────────────
// HELPER — format time ago from date
// ─────────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "";
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(date).toLocaleDateString();
};

// ─────────────────────────────────────────────────────────────
// HELPER — Avatar with initials fallback
// ─────────────────────────────────────────────────────────────
const Avatar = ({ photo, name, size = 48 }) => {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full shrink-0 flex items-center justify-center
                 text-sm font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: "rgb(var(--surface))",
        color: "rgb(var(--primary))",
      }}
    >
      {initials}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENT — single thread row
// ─────────────────────────────────────────────────────────────
const ThreadItem = ({ thread, onClick }) => {
  const { otherUser, lastMessage, lastMessageAt, unreadCount } = thread;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer
                 transition-colors border-b"
      style={{
        borderColor: "rgb(var(--border))",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = "rgb(var(--surface))")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = "transparent")
      }
    >
      {/* Avatar */}
      <Avatar photo={otherUser?.photo} name={otherUser?.name} size={48} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {/* Name */}
          <p
            className="font-semibold text-sm truncate"
            style={{ color: "rgb(var(--text))" }}
          >
            {otherUser?.name || "Unknown"}
          </p>

          {/* Time */}
          <span
            className="text-xs shrink-0"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {timeAgo(lastMessageAt)}
          </span>
        </div>

        {/* Role */}
        <p
          className="text-xs capitalize mb-0.5"
          style={{ color: "rgb(var(--text-muted))" }}
        >
          {otherUser?.role || ""}
        </p>

        {/* Last message + unread badge */}
        <div className="flex items-center justify-between gap-2">
          <p
            className="text-sm truncate flex-1"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {lastMessage || "No messages yet"}
          </p>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span
              className="text-xs rounded-full px-2 py-0.5 shrink-0
                         font-medium text-white"
              style={{ backgroundColor: "rgb(var(--primary))" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <span
        className="text-lg shrink-0"
        style={{ color: "rgb(var(--border-strong))" }}
      >
        ›
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN — MessagesPage
// Layout: fixed header + fixed search + scrollable list
// ─────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [threads, setThreads] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Role based path ────────────────────────────────────────
  let path = "";
  if (user?.role === "school_admin") path = "/school";
  else if (user?.role === "teacher_admin") path = "/teacher";
  else if (user?.role === "student_admin")
    path = user.loginAs === "student" ? "/student" : "/parent";
  else if (user?.role === "staff_admin") path = "/staff";

  // ── Fetch threads ──────────────────────────────────────────
  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API}/message-signal/threads`, {
        withCredentials: true,
      });
      setThreads(res.data.threads || []);
      setFiltered(res.data.threads || []);
    } catch (err) {
      console.error("❌ fetchThreads error:", err.message);
      setError("Failed to load messages. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // ── Client side search ─────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(threads);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      threads.filter(
        (t) =>
          t.otherUser?.name?.toLowerCase().includes(q) ||
          t.otherUser?.role?.toLowerCase().includes(q) ||
          t.lastMessage?.toLowerCase().includes(q)
      )
    );
  }, [search, threads]);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // Full height, fixed header + search, scrollable list only
  // ─────────────────────────────────────────────────────────
  return (
    <div
  className="flex flex-col w-full max-w-2xl mx-auto"
  style={{
    backgroundColor: "rgb(var(--bg))",
    height: "calc(100vh - 57px)", // 57px = your Topbar height
  }}
>
      {/* ── FIXED HEADER ── */}
      <div
        className="shrink-0 flex items-center justify-between
                   px-4 pt-5 pb-3 border-b"
        style={{
          backgroundColor: "rgb(var(--bg))",
          borderColor: "rgb(var(--border))",
        }}
      >
        <h1
          className="text-xl font-bold"
          style={{ color: "rgb(var(--primary))" }}
        >
          Messages
        </h1>

        {/* + button */}
        <button
          onClick={() => navigate(`${path}/messages/new`)}
          className="p-2 rounded-xl transition"
          style={{ color: "rgb(var(--primary))" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgb(var(--surface))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
          title="New Message"
        >
          <FiPlus size={22} />
        </button>
      </div>

      {/* ── FIXED SEARCH BAR ── */}
      <div
        className="shrink-0 px-4 py-3 border-b"
        style={{
          backgroundColor: "rgb(var(--bg))",
          borderColor: "rgb(var(--border))",
        }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: "rgb(var(--surface))" }}
        >
          <FiSearch
            className="shrink-0"
            style={{ color: "rgb(var(--text-muted))" }}
          />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm w-full"
            style={{
              color: "rgb(var(--text))",
            }}
          />
          {/* Clear search */}
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs shrink-0"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── SCROLLABLE THREAD LIST ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center
                          py-20 gap-3">
            <div
              className="w-8 h-8 border-4 border-t-transparent
                         rounded-full animate-spin"
              style={{ borderColor: "rgb(var(--primary))" ,
                       borderTopColor: "transparent" }}
            />
            <p
              className="text-sm"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              Loading messages...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-20 px-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchThreads}
              className="mt-3 text-sm underline"
              style={{ color: "rgb(var(--primary))" }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center
                          py-20 gap-3 px-4">
            <FiMessageSquare
              size={48}
              style={{ color: "rgb(var(--border-strong))" }}
            />
            <p
              className="text-sm text-center"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              {search
                ? "No results found."
                : "No messages yet. Tap + to start."}
            </p>
          </div>
        )}

        {/* Thread list */}
        {!loading && !error && filtered.length > 0 &&
          filtered.map((thread) => (
            <ThreadItem
              key={thread._id}
              thread={thread}
              onClick={() => navigate(`${path}/messages/${thread._id}`)}
            />
          ))
        }
      </div>
    </div>
  );
}