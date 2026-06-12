import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { FiSearch, FiArrowLeft } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

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
// COMPONENT — single user row
// ─────────────────────────────────────────────────────────────
const UserItem = ({ user, onClick, loading }) => (
  <div
    onClick={() => !loading && onClick(user)}
    className="flex items-center gap-3 px-4 py-3 border-b transition-colors"
    style={{
      borderColor: "rgb(var(--border))",
      cursor: loading ? "not-allowed" : "pointer",
      opacity: loading ? 0.5 : 1,
    }}
    onMouseEnter={(e) => {
      if (!loading)
        e.currentTarget.style.backgroundColor = "rgb(var(--surface))";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
  >
    {/* Avatar */}
    <Avatar photo={user.photo} name={user.name} />

    {/* Name + role */}
    <div className="flex-1 min-w-0">
      <p
        className="font-semibold text-sm truncate"
        style={{ color: "rgb(var(--text))" }}
      >
        {user.name}
      </p>
      <p
        className="text-xs capitalize"
        style={{ color: "rgb(var(--text-muted))" }}
      >
        {user.role}
      </p>
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

// ─────────────────────────────────────────────────────────────
// MAIN — NewMessagePage
// Layout: fixed header + fixed search + scrollable user list
// ─────────────────────────────────────────────────────────────
export default function NewMessagePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // ── Role based path ────────────────────────────────────────
  let path = "";
  if (user?.role === "school_admin") path = "/school";
  else if (user?.role === "teacher_admin") path = "/teacher";
  else if (user?.role === "student_admin")
    path = user.loginAs === "student" ? "/student" : "/parent";
  else if (user?.role === "staff_admin") path = "/staff";

  // ── Fetch users ────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API}/message-signal/users`, {
        withCredentials: true,
      });
      setUsers(res.data.users || []);
      setFiltered(res.data.users || []);
    } catch (err) {
      console.error("❌ fetchUsers error:", err.message);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Client side search ─────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(users);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      users.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q)
      )
    );
  }, [search, users]);

  // ── Start or fetch thread then navigate ───────────────────
  const handleSelectUser = async (selectedUser) => {
    try {
      setStarting(true);
      const res = await axios.post(
        `${API}/message-signal/thread/start`,
        {
          targetId: selectedUser._id,
          targetModel: selectedUser.model,
        },
        { withCredentials: true }
      );
      navigate(`${path}/messages/${res.data.threadId}`);
    } catch (err) {
      console.error("❌ handleSelectUser error:", err.message);
      setError("Could not start conversation. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // Full height, fixed header + search, scrollable list only
  // ─────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col w-full max-w-2xl mx-auto"
      style={{
        backgroundColor: "rgb(var(--bg))",
        height: "calc(100vh - 57px)", // adjust 57px to your topbar height
      }}
    >
      {/* ── FIXED HEADER ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 pt-5 pb-3 border-b"
        style={{
          backgroundColor: "rgb(var(--bg))",
          borderColor: "rgb(var(--border))",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate(`${path}/messages`)}
          className="p-1 rounded-lg transition shrink-0"
          style={{ color: "rgb(var(--primary))" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgb(var(--surface))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
          title="Back"
        >
          <FiArrowLeft size={22} />
        </button>

        <h1
          className="text-xl font-bold flex-1 text-center"
          style={{ color: "rgb(var(--primary))" }}
        >
          New Message
        </h1>

        {/* Spacer — keeps title centered */}
        <div className="w-8 shrink-0" />
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
            style={{ color: "rgb(var(--text))" }}
          />
          {/* Clear button */}
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

      {/* ── SCROLLABLE USER LIST ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center
                          py-20 gap-3">
            <div
              className="w-8 h-8 border-4 border-t-transparent
                         rounded-full animate-spin"
              style={{
                borderColor: "rgb(var(--primary))",
                borderTopColor: "transparent",
              }}
            />
            <p className="text-sm" style={{ color: "rgb(var(--text-muted))" }}>
              Loading...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-20 px-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchUsers}
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
                          py-20 gap-2 px-4">
            <p
              className="text-sm text-center"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              {search ? "No users found." : "No users available."}
            </p>
          </div>
        )}

        {/* User list */}
        {!loading && !error && filtered.length > 0 &&
          filtered.map((u) => (
            <UserItem
              key={`${u.model}-${u._id}`}
              user={u}
              onClick={handleSelectUser}
              loading={starting}
            />
          ))
        }
      </div>

      {/* ── Starting thread overlay ── */}
      {starting && (
        <div className="fixed inset-0 bg-black/30 flex items-center
                        justify-center z-50">
          <div
            className="rounded-2xl px-8 py-6 flex flex-col
                       items-center gap-3 shadow-xl"
            style={{ backgroundColor: "rgb(var(--bg))" }}
          >
            <div
              className="w-8 h-8 border-4 border-t-transparent
                         rounded-full animate-spin"
              style={{
                borderColor: "rgb(var(--primary))",
                borderTopColor: "transparent",
              }}
            />
            <p
              className="text-sm"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              Opening conversation...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}