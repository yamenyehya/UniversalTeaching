import { Router } from "express";
import { OwnerController } from "../controllers/OwnerController.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";
import { roleMiddleware } from "../middleware/roleMiddleware.ts";

const router = Router();

// Protect ALL routes with Owner authorization
router.use(authMiddleware);
router.use(roleMiddleware(["owner"]));

// 1. Stats Dashboard
router.get("/stats", OwnerController.getStats);

// 2. School Management
router.get("/schools", OwnerController.getSchools);
router.post("/schools", OwnerController.createSchool);
router.put("/schools/:schoolId", OwnerController.updateSchool);
router.delete("/schools/:schoolId", OwnerController.deleteSchool);

// 3. User Management
router.get("/users", OwnerController.getUsers);
router.post("/users", OwnerController.createUser);
router.put("/users/:userId", OwnerController.updateUser);
router.delete("/users/:userId", OwnerController.deleteUser);

// 4. File Management
router.get("/files", OwnerController.getFiles);
router.put("/files/:fileId", OwnerController.updateFile);
router.delete("/files/:fileId", OwnerController.deleteFile);

// 5. Bulk User Import
router.post("/bulk-import", OwnerController.bulkImport);
router.post("/ai-parse-import", OwnerController.aiParseImport);

export default router;
