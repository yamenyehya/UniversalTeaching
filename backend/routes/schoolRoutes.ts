import { Router } from "express";
import { SchoolController } from "../controllers/SchoolController.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";
import { roleMiddleware } from "../middleware/roleMiddleware.ts";

const router = Router();

// Only authenticated users can look up schools
router.use(authMiddleware);

// School creation is Owner-only and lives at POST /owner/schools.

// GET /schools/:schoolId - Get a school's settings/info (any member of that school, or the Owner)
router.get("/:schoolId", SchoolController.getSchoolById);

// GET /schools/:schoolId/analytics - Get secure multi-tenant analytics for a school (Admins/Owner only)
router.get("/:schoolId/analytics", SchoolController.getSchoolAnalytics);

// GET /schools - Global list of every school (Owner only — this is platform-wide data, not tenant data)
router.get("/", roleMiddleware(["owner"]), SchoolController.getAllSchools);

export default router;
