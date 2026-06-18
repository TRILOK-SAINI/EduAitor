import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

/**
 * Bottom sheet shown from the "Profile" tab of BottomNav.
 * Shows user info, theme switcher, and logout.
 */
const ProfileSheet = ({ onClose }) => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "theme-light",
  );

  const name = user?.name || user?.school_name || "User";
  const role = user?.role || "User";
  const loginAs = user?.loginAs;

  const getInitials = (n) => {
    if (!n) return "U";
    return n
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.info("Logged out successfully");
    } catch {
      toast.error("Logout failed");
    }
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-6 pt-3 pb-10 bg-[rgb(var(--bg))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-6 bg-[rgb(var(--border))]" />

        {/* User info card */}
        <div className="flex items-center gap-3 mb-6 p-3 rounded-2xl bg-[rgba(var(--primary),0.06)]">
          <div className="w-12 h-12 rounded-full bg-[rgb(var(--primary))] flex items-center justify-center text-sm font-bold text-white shadow shrink-0">
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[rgb(var(--text))] truncate">
              {name}
            </p>
            <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest text-[rgb(var(--text))]">
              {loginAs
                ? loginAs.toUpperCase()
                : role.replace("_", " ").toUpperCase()}
            </p>
          </div>
        </div>

        {/* Theme */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-bold text-[rgb(var(--text))] opacity-40 uppercase">
              Appearance
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-bold capitalize">
              {theme.replace("theme-", "")}
            </span>
          </div>
          <div className="flex items-center justify-between bg-black/5 p-2 rounded-xl">
            {[
              {
                id: "theme-light",
                color: "bg-white",
                border: "border-gray-200",
              },
              {
                id: "theme-dark",
                color: "bg-slate-800",
                border: "border-slate-700",
              },
              {
                id: "theme-blue",
                color: "bg-blue-500",
                border: "border-blue-400",
              },
              {
                id: "theme-green",
                color: "bg-emerald-500",
                border: "border-emerald-400",
              },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  document.documentElement.className = t.id;
                  localStorage.setItem("theme", t.id);
                }}
                className="relative group w-8 h-8 flex items-center justify-center"
              >
                {theme === t.id && (
                  <span className="absolute inset-0 rounded-full bg-orange-500/20 animate-pulse scale-125" />
                )}
                <div
                  className={`w-6 h-6 rounded-full ${t.color} ${t.border} border shadow-sm transition-all transform group-hover:scale-110 group-active:scale-90 ${
                    theme === t.id
                      ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-[rgb(var(--bg))]"
                      : "opacity-80 hover:opacity-100"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold active:scale-95 transition-transform border
              border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
          >
            Close
          </button>
          <button
            onClick={logout}
            className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white active:scale-95 transition-transform
              bg-gradient-to-br from-[rgb(var(--sidebar))] to-[rgb(var(--primary))]"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSheet;
