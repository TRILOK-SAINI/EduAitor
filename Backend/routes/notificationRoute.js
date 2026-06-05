import express from "express";
const router = express.Router();

import { authMiddleware } from "../auth/auth.js";
import {
  createNotification,
  getTopbarNotifications,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  dismissAllNotifications,
} from "../controllers/notificationController.js";

// ── Topbar dropdown — excludes dismissedBy ────────────────────────────────────
router.get("/topbar", authMiddleware, getTopbarNotifications);

// ── Notification Page — full history, ignores dismissedBy ─────────────────────
router.get("/", authMiddleware, getAllNotifications);

// ── Create (school admin) ─────────────────────────────────────────────────────
router.post("/", authMiddleware, createNotification);

// ── Read actions ─────────────────────────────────────────────────────────────
router.patch("/read-all", authMiddleware, markAllAsRead);
router.patch("/:id/read", authMiddleware, markAsRead);

// ── Dismiss all from topbar (NOT a permanent delete) ─────────────────────────
router.patch("/dismiss-all", authMiddleware, dismissAllNotifications);

export default router;