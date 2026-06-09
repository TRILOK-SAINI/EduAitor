import express from "express";
import { authMiddleware } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js"
;import upload from "../middlewares/upload.js";
import {
  createStaff,
  getStaff,
  getSingleStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
} from "../controllers/staffController.js";

const router = express.Router();

// all routes need auth
// create / update / delete / toggle need staff module access

router.post(
  "/",
  authMiddleware,
  checkModuleAccess("staff"),
  upload.single("photo"),
  createStaff
);

router.get(
  "/",
  authMiddleware,
  checkModuleAccess("staff"),
  getStaff
);

router.get(
  "/:id",
  authMiddleware,
  checkModuleAccess("staff"),
  getSingleStaff
);

router.put(
  "/:id",
  authMiddleware,
  checkModuleAccess("staff"),
  upload.single("photo"),
  updateStaff
);

router.patch(
  "/:id/toggle-status",
  authMiddleware,
  checkModuleAccess("staff"),
  toggleStaffStatus
);

router.delete(
  "/:id",
  authMiddleware,
  checkModuleAccess("staff"),
  deleteStaff
);

export default router;