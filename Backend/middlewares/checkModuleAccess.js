import School from "../models/school.js"; // adjust path

/**
 * checkModuleAccess("library")
 * Returns an express middleware that blocks the request
 * if the school has not subscribed to that module.
 *
 * Usage on routes:
 * router.get("/books", authMiddleware, checkModuleAccess("library"), controller)
 */

const checkModuleAccess = (moduleKey) => {
  return async (req, res, next) => {
    try {
      // ── 1. SUPER ADMIN — always bypass ───────────────
      if (req.user.role === "super_admin") {
        return next();
      }

      // ── 2. GET SCHOOL ID FROM JWT ─────────────────────
      const schoolId = req.user.school_id;

      if (!schoolId) {
        return res.status(403).json({
          success: false,
          message: "School not identified. Access denied.",
        });
      }

      // ── 3. FETCH SCHOOL MODULES FROM DB ──────────────
      // always fresh from DB — not from JWT
      // so if super admin updates modules, takes effect immediately
      const school = await School
        .findById(schoolId)
        .select("subscribed_modules status");

      // ── 4. SCHOOL EXISTS? ─────────────────────────────
      if (!school) {
        return res.status(403).json({
          success: false,
          message: "School not found. Access denied.",
        });
      }

      // ── 5. SCHOOL ACTIVE? ─────────────────────────────
      if (school.status === "Inactive") {
        return res.status(403).json({
          success: false,
          message: "Your school account is inactive. Contact administrator.",
        });
      }

      // ── 6. MODULE SUBSCRIBED? ─────────────────────────
      if (!school.subscribed_modules.includes(moduleKey)) {
        return res.status(403).json({
          success: false,
          message: `Your school has not subscribed to the '${moduleKey}' module. Please upgrade your plan.`,
        });
      }

      // ── 7. ALL CHECKS PASSED — proceed ───────────────
      next();

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Module access check failed.",
      });
    }
  };
};

export default checkModuleAccess;