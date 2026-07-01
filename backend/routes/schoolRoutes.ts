import { Router } from "express";
import { SchoolController } from "../controllers/SchoolController.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";
import { roleMiddleware } from "../middleware/roleMiddleware.ts";

const router = Router();

// Only authenticated users can look up schools
router.use(authMiddleware);

// POST /schools - Onboard a new school (Admins only)
router.post("/", roleMiddleware(["admin"]), SchoolController.createSchool);

// GET /schools/:schoolId - Get a school's settings/info (Admins/Teachers/Students/Coordinators belonging to this school)
router.get("/:schoolId", SchoolController.getSchoolById);

// GET /schools/:schoolId/analytics - Get secure multi-tenant analytics for a school (Admins/Owner only)
router.get("/:schoolId/analytics", SchoolController.getSchoolAnalytics);

// GET /schools - Get list of schools
router.get("/", SchoolController.getAllSchools);

export default router;
