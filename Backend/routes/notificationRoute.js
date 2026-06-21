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
  updateNotification,  
  deleteNotification,   
} from "../controllers/notificationController.js";
import upload from "../middlewares/upload.js"

// ── Topbar dropdown — excludes dismissedBy ────────────────────────────────────
router.get("/topbar", authMiddleware, getTopbarNotifications);

// ── Notification Page — full history, ignores dismissedBy ─────────────────────
router.get("/", authMiddleware, getAllNotifications);

// ── Create (school admin) ─────────────────────────────────────────────────────
router.post("/", authMiddleware,  upload.array('pdfs', 5),createNotification);
// ── Edit / Delete (within the grace window) ───────────────────────────────────
router.put("/:id",    authMiddleware, upload.array('pdfs', 5), updateNotification);
router.delete("/:id", authMiddleware, deleteNotification);

// ── Read actions ─────────────────────────────────────────────────────────────
router.patch("/read-all", authMiddleware, markAllAsRead);
router.patch("/:id/read", authMiddleware, markAsRead);

// ── Dismiss all from topbar (NOT a permanent delete) ─────────────────────────
router.patch("/dismiss-all", authMiddleware, dismissAllNotifications);

export default router;