import { Response } from "express";
import { FileService } from "../services/FileService.ts";
import { AuthenticatedRequest } from "../middleware/authMiddleware.ts";
import { documentUpload } from "../utils/upload.ts";
import fs from "fs";
import path from "path";

export class FileController {
  // Upload a document
  static async uploadFile(req: AuthenticatedRequest, res: Response) {
    const singleUpload = documentUpload.single("file");

    singleUpload(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: `File upload rejected: ${err.message}` });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No document file provided for upload." });
      }

      try {
        const { title, description, grade, subject, schoolId, permissions, category } = req.body;

        if (!title || !schoolId) {
          if (req.file && req.file.path) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Title and schoolId are required fields." });
        }

        // Only teachers, coordinators, admins, or owner are permitted to upload
        if (!req.user || !["owner", "admin", "teacher", "coordinator"].includes(req.user.role)) {
          if (req.file && req.file.path) fs.unlinkSync(req.file.path);
          return res.status(403).json({ error: "Access denied. Only staff can upload materials." });
        }

        // Restrict to same school unless platform owner
        if (req.user.role !== "owner" && req.user.schoolId !== schoolId) {
          if (req.file && req.file.path) fs.unlinkSync(req.file.path);
          return res.status(403).json({ error: "Access denied. You cannot upload files for another school." });
        }

        // Parse custom permissions object if passed, else build standard defaults
        let parsedPermissions = {};
        if (permissions) {
          try {
            parsedPermissions = typeof permissions === "string" ? JSON.parse(permissions) : permissions;
          } catch (e) {
            // Safe fallback
          }
        }

        // Generate virtual path for access (e.g. /uploads/documents/filename)
        const fileUrl = `/uploads/documents/${req.file.filename}`;
        const fileType = path.extname(req.file.originalname).substring(1).toLowerCase();

        const fileRecord = await FileService.createFile({
          schoolId,
          uploadedBy: req.user.userId,
          teacherId: req.user.userId, // Default teacherId is the uploader
          title,
          description,
          fileType,
          fileUrl,
          size: req.file.size,
          grade,
          subject,
          category,
          permissions: parsedPermissions,
        });

        return res.status(201).json({
          message: "Document uploaded successfully",
          file: fileRecord,
        });
      } catch (innerErr) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: (innerErr as Error).message });
      }
    });
  }

  // Get files for school
  static async getFilesBySchool(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId } = req.params;

      if (!req.user) return res.status(401).json({ error: "Unauthorized." });

      // Cross-school security check (unless owner)
      if (req.user.role !== "owner" && req.user.schoolId !== schoolId) {
        return res.status(403).json({ error: "Access denied. School data isolated." });
      }

      const files = await FileService.getFilesBySchool(schoolId);

      // Filter based on strict permissions
      const visibleFiles = files.filter((file) => {
        return FileService.hasPermission(req.user!, file, "read");
      });

      return res.status(200).json(visibleFiles);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // Get files uploaded by teacher (Teacher-centric workspace viewing)
  static async getFilesByTeacher(req: AuthenticatedRequest, res: Response) {
    try {
      const { teacherId } = req.params;

      if (!req.user) return res.status(401).json({ error: "Unauthorized." });

      const files = await FileService.getFilesByTeacher(teacherId);

      // Filter based on strict permissions
      const visibleFiles = files.filter((file) => {
        return FileService.hasPermission(req.user!, file, "read");
      });

      return res.status(200).json(visibleFiles);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // Get single file detail and download
  static async getFileDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { fileId } = req.params;

      if (!req.user) return res.status(401).json({ error: "Unauthorized." });

      const file = await FileService.getFileById(fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found." });
      }

      if (!FileService.hasPermission(req.user, file, "read")) {
        return res.status(403).json({ error: "Access denied. You do not have permission to view this file." });
      }

      return res.status(200).json(file);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // Update file metadata (Admin/Teacher/Coordinator)
  static async updateFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { fileId } = req.params;
      const data = req.body;

      if (!req.user) return res.status(401).json({ error: "Unauthorized." });

      const file = await FileService.getFileById(fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found." });
      }

      if (!FileService.hasPermission(req.user, file, "write")) {
        return res.status(403).json({ error: "Access denied. You cannot modify this file." });
      }

      // Restrict modification fields (e.g. fileUrl cannot be edited manually)
      delete data.fileUrl;
      delete data.fileId;
      delete data.uploadedBy;

      const updated = await FileService.updateFile(fileId, data);
      return res.status(200).json({
        message: "File updated successfully",
        file: updated,
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  }

  // Delete file (Admin/Teacher/Coordinator)
  static async deleteFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { fileId } = req.params;

      if (!req.user) return res.status(401).json({ error: "Unauthorized." });

      const file = await FileService.getFileById(fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found." });
      }

      if (!FileService.hasPermission(req.user, file, "delete")) {
        return res.status(403).json({ error: "Access denied. You cannot delete this file." });
      }

      // 1. Delete physical file on disk
      if (file.fileUrl && file.fileUrl.startsWith("/uploads/documents/")) {
        const filePath = path.join(process.cwd(), file.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // 2. Delete database entry
      await FileService.deleteFile(fileId);

      return res.status(200).json({ message: "Document deleted successfully." });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }
}
