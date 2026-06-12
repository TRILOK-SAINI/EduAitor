import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { FiMessageSquare } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────────────────────────
// MessageButton — drop this on ANY profile page
//
// Required props:
//   targetId    — MongoDB _id of the person you want to message
//   targetModel — "Teacher" | "Student" | "Staff" | "School"
//
// Optional props:
//   label       — button text (default: "Message")
//   className   — extra tailwind classes to override styling
//   iconOnly    — show only icon, no text (for compact layouts)
//
// Usage examples:
//   <MessageButton targetId={teacher._id} targetModel="Teacher" />
//   <MessageButton targetId={student._id} targetModel="Student" iconOnly />
//   <MessageButton targetId={school._id}  targetModel="School"
//                  label="Contact Admin" className="w-full" />
// ─────────────────────────────────────────────────────────────
export default function MessageButton({
  targetId,
  targetModel,
  label = "Message",
  className = "",
  iconOnly = false,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Allowed models ─────────────────────────────────────────
  const allowedModels = ["Teacher", "Student", "Staff", "School"];

  // ── Get my own ID from auth context ───────────────────────
  const getMyId = () => {
    if (!user) return null;
    if (user.role === "teacher_admin") return user.teacher_id;
    if (user.role === "student_admin") return user.student_id;
    if (user.role === "staff_admin") return user.staff_id;
    if (user.role === "school_admin") return user.school_id;
    return null;
  };

    let path = "";

if (user.role === "school_admin") {
  path = "/school";
} else if (user.role === "teacher_admin") {
  path = "/teacher";
} else if (user.role === "student_admin") {
  // Check whether the student_admin is logged in as a student or a parent
  if (user.loginAs === "student") {
    path = "/student";
  } else {
    path = "/parent";
  }
} else if (user.role === "staff_admin") {
  path = "/staff";
}

  // ── Handle button click ────────────────────────────────────
  const handleClick = async () => {
    // Validate — user must be logged in
    if (!user) {
      setError("You must be logged in to send messages.");
      return;
    }

    // Validate — super_admin not supported in messaging
    if (user.role === "super_admin") {
      setError("Messaging is not available for super admin.");
      return;
    }

    // Validate — targetId and targetModel are required
    if (!targetId || !targetModel) {
      setError("Invalid user.");
      return;
    }

    // Validate — targetModel must be allowed
    if (!allowedModels.includes(targetModel)) {
      setError("Invalid user type.");
      return;
    }

    // Validate — cannot message yourself
    const myId = getMyId();
    if (myId?.toString() === targetId?.toString()) {
      setError("You cannot message yourself.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Start or fetch existing thread
      const res = await axios.post(
        `${API}/message-signal/thread/start`,
        { targetId, targetModel },
        { withCredentials: true }
      );

      const { threadId } = res.data;

      // Navigate to chat page
      navigate(`${path}/messages/${threadId}`);
    } catch (err) {
      console.error("❌ MessageButton error:", err.message);

      // Show user friendly error based on status
      if (err.response?.status === 403) {
        setError("You cannot message this person.");
      } else if (err.response?.status === 404) {
        setError("User not found.");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        title={label}
        className={`
          flex items-center justify-center gap-2
          bg-indigo-500 hover:bg-indigo-600 text-white
          rounded-xl transition font-medium text-sm
          disabled:opacity-50 disabled:cursor-not-allowed
          ${iconOnly ? "p-2" : "px-4 py-2"}
          ${className}
        `}
      >
        {/* Loading spinner */}
        {loading ? (
          <div className="w-4 h-4 border-2 border-white
                          border-t-transparent rounded-full animate-spin" />
        ) : (
          <FiMessageSquare size={16} />
        )}

        {/* Label — hidden when iconOnly */}
        {!iconOnly && (
          <span>{loading ? "Opening..." : label}</span>
        )}
      </button>

      {/* Inline error — shows below button */}
      {error && (
        <p className="text-xs text-red-400 text-center max-w-[160px]">
          {error}
        </p>
      )}
    </div>
  );
}