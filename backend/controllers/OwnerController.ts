import { Request, Response } from "express";
import { SchoolService } from "../services/SchoolService.ts";
import { UserService } from "../services/UserService.ts";
import { FileService } from "../services/FileService.ts";
import { AuthenticatedRequest } from "../middleware/authMiddleware.ts";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

export class OwnerController {
  // 1. Get platform-wide statistics for SaaS dashboard
  static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const schools = await SchoolService.getAllSchools();
      const users = await UserService.getAllUsers();
      const files = await FileService.getAllFiles();

      const totalSchools = schools.length;
      const totalUsers = users.length;
      const totalFiles = files.length;

      // Calculate total file storage used
      const totalStorage = files.reduce((acc: number, f: any) => acc + (f.size || 0), 0);

      // Distribute users by roles
      const roleCounts = users.reduce((acc: Record<string, number>, u: any) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {});

      // Distribute files by file types
      const fileTypeCounts = files.reduce((acc: Record<string, number>, f: any) => {
        const type = f.fileType || "unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      return res.status(200).json({
        totalSchools,
        totalUsers,
        totalFiles,
        totalStorage,
        roleCounts,
        fileTypeCounts,
      });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // 2. Schools CRUD
  static async getSchools(req: AuthenticatedRequest, res: Response) {
    try {
      const schools = await SchoolService.getAllSchools();
      return res.status(200).json(schools);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  static async createSchool(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId, schoolName, settings } = req.body;
      if (!schoolId || !schoolName) {
        return res.status(400).json({ error: "schoolId and schoolName are required fields." });
      }

      const school = await SchoolService.createSchool(schoolId, schoolName, settings || {});
      return res.status(201).json({
        message: "School created successfully",
        school,
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  }

  static async updateSchool(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId } = req.params;
      const { schoolName, settings } = req.body;

      const updated = await SchoolService.updateSchool(schoolId, { schoolName, settings });
      if (!updated) {
        return res.status(404).json({ error: "School not found." });
      }

      return res.status(200).json({
        message: "School updated successfully",
        school: updated,
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  }

  static async deleteSchool(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId } = req.params;

      const deleted = await SchoolService.deleteSchool(schoolId);
      if (!deleted) {
        return res.status(404).json({ error: "School not found." });
      }

      // Cascade delete school users and files (Production-level multi-tenant design)
      const allUsers = await UserService.getAllUsers();
      const schoolUsers = allUsers.filter((u: any) => u.schoolId === schoolId && u.role !== "owner");
      for (const u of schoolUsers) {
        await UserService.deleteUser(u.userId);
      }

      const allFiles = await FileService.getAllFiles();
      const schoolFiles = allFiles.filter((f: any) => f.schoolId === schoolId);
      for (const f of schoolFiles) {
        if (f.fileUrl && f.fileUrl.startsWith("/uploads/documents/")) {
          const filePath = path.join(process.cwd(), f.fileUrl);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (unlinkErr) {
              // Fail-safe physical file delete
            }
          }
        }
        await FileService.deleteFile(f.fileId);
      }

      return res.status(200).json({
        message: `School ${schoolId} and all associated data deleted successfully.`,
      });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // 3. Users CRUD
  static async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const users = await UserService.getAllUsers();
      // Remove sensitive password hashes from the response
      const safeUsers = users.map((u: any) => {
        const doc = u.toObject ? u.toObject() : { ...u };
        delete doc.passwordHash;
        return doc;
      });
      return res.status(200).json(safeUsers);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId, role, name, username, email, password, grade, subject, permissions } = req.body;

      if (!schoolId || !role || !name || !username || !email || !password) {
        return res.status(400).json({
          error: "schoolId, role, name, username, email, and password are required fields.",
        });
      }

      const user = await UserService.createUser({
        schoolId,
        role,
        name,
        username,
        email,
        password,
        grade,
        subject,
      });

      // If custom permissions were passed, update them
      if (permissions) {
        await UserService.updateUser(user.userId, { permissions });
      }

      return res.status(201).json({
        message: "User created successfully",
        user,
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  }

  static async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const data = { ...req.body };

      // Hash password if the Owner is resetting it
      if (data.password && data.password.trim() !== "") {
        data.passwordHash = await bcrypt.hash(data.password, 10);
      }
      delete data.password;

      const updated = await UserService.updateUser(userId, data);
      if (!updated) {
        return res.status(404).json({ error: "User not found." });
      }

      return res.status(200).json({
        message: "User updated successfully",
        user: updated,
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  }

  static async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;

      const user = await UserService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      await UserService.deleteUser(userId);
      return res.status(200).json({ message: "User deleted successfully." });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // 4. Files CRUD (Owner Metadata Override)
  static async getFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const files = await FileService.getAllFiles();
      return res.status(200).json(files);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  static async updateFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { fileId } = req.params;
      const data = req.body;

      // Prevent changing fileUrl/fileId directly through standard edit
      delete data.fileUrl;
      delete data.fileId;

      const updated = await FileService.updateFile(fileId, data);
      if (!updated) {
        return res.status(404).json({ error: "File not found." });
      }

      return res.status(200).json({
        message: "File metadata updated successfully",
        file: updated,
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  }

  static async deleteFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { fileId } = req.params;

      const file = await FileService.getFileById(fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found." });
      }

      // Delete physical file
      if (file.fileUrl && file.fileUrl.startsWith("/uploads/documents/")) {
        const filePath = path.join(process.cwd(), file.fileUrl);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Fail-safe file delete
          }
        }
      }

      await FileService.deleteFile(fileId);
      return res.status(200).json({ message: "File and storage deleted successfully." });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // 5. Bulk User Importer inside UI (restricted Owner Python simulation or actual API handler)
  static async bulkImport(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId, names, role, grade, subject } = req.body;

      if (!schoolId || !names || !Array.isArray(names) || !role) {
        return res.status(400).json({
          error: "schoolId, role, and names (string array) are required fields for bulk import.",
        });
      }

      const result = await UserService.bulkImportUsers(schoolId, names, role, { grade, subject });
      return res.status(200).json({
        message: "Owner bulk onboard import completed successfully",
        schoolId,
        role,
        ...result,
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  }

  // NOTE: The previous Gemini-powered "aiParseImport" endpoint has been
  // removed. The Excel importer is being rebuilt as a deterministic,
  // non-AI parser (planned as a separate stage) that reads structured
  // spreadsheet columns directly rather than relying on an external LLM.
}
