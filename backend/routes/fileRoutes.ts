import { Router } from "express";
import { FileController } from "../controllers/FileController.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";
import { roleMiddleware } from "../middleware/roleMiddleware.ts";

const router = Router();

// Secure all file endpoints
router.use(authMiddleware);

// POST /files/upload - Upload a file (Admins, Teachers, or Coordinators only)
router.post("/upload", roleMiddleware(["admin", "teacher", "coordinator"]), FileController.uploadFile);

// GET /files/:schoolId - Get all files for a school (Checks read permissions per file)
router.get("/:schoolId", FileController.getFilesBySchool);

// GET /files/teacher/:teacherId - Get all files uploaded by a teacher (Teacher-centric view)
router.get("/teacher/:teacherId", FileController.getFilesByTeacher);

// GET /files/detail/:fileId - Get single file details/metadata (Note: using /detail/:fileId to avoid matching :schoolId route)
router.get("/detail/:fileId", FileController.getFileDetails);

// PUT /files/:fileId - Update file details (Uploader, coordinator of subject/grade, or admin)
router.put("/:fileId", FileController.updateFile);

// DELETE /files/:fileId - Remove file record and local disk asset
router.delete("/:fileId", FileController.deleteFile);

export default router;
