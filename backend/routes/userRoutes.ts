import { Router } from "express";
import { UserController } from "../controllers/UserController.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";
import { roleMiddleware } from "../middleware/roleMiddleware.ts";

const router = Router();

// Endpoint for bulk importing from the Excel script (can use JWT Auth or admin credentials)
// We will support JWT authorization on bulk-import so the importer script runs safely.
// Note: We can place authMiddleware on this route, allowing only 'admin' or authenticated staff to trigger imports.
router.post("/bulk-import", authMiddleware, roleMiddleware(["admin"]), UserController.bulkImport);

// Secure other user management routes
router.use(authMiddleware);

// POST /users - Create an individual user
router.post("/", roleMiddleware(["admin"]), UserController.createUser);

// GET /users/:schoolId - Get all users for a school
router.get("/:schoolId", UserController.getUsersBySchool);

// GET /users/profile/:userId - Retrieve a user's details
router.get("/profile/:userId", UserController.getUserProfile);

// PUT /users/:userId - Update user metadata
router.put("/:userId", UserController.updateUser);

// DELETE /users/:userId - Delete user account
router.delete("/:userId", roleMiddleware(["admin"]), UserController.deleteUser);

// POST /users/:userId/profile-image - Upload avatar (multipart upload handler)
router.post("/:userId/profile-image", UserController.uploadProfileImage);

// DELETE /users/:userId/profile-image - Reset avatar
router.delete("/:userId/profile-image", UserController.deleteProfileImage);

export default router;
