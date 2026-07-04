import { Request, Response } from "express";
import { UserService } from "../services/UserService.ts";
import { AuthenticatedRequest } from "../middleware/authMiddleware.ts";
import { avatarUpload } from "../utils/upload.ts";
import fs from "fs";
import path from "path";

export class UserController {
  // Create user
  static async createUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId, role, name, username, email, password, grade, subject } = req.body;

      if (!schoolId || !role || !name) {
        return res.status(400).json({ error: "schoolId, role, and name are required." });
      }

      // Restrict to school admins or platform owner
      if (req.user?.role !== "owner" && (req.user?.role !== "admin" || req.user?.schoolId !== schoolId)) {
        return res.status(403).json({ error: "Access denied. You cannot manage users for this school." });
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

      return res.status(201).json({
        message: "User created successfully",
        user: {
          userId: user.userId,
          schoolId: user.schoolId,
          role: user.role,
          name: user.name,
          username: user.username,
          email: user.email,
          grade: user.grade,
          subject: user.subject,
          profileImage: user.profileImage,
          permissions: user.permissions,
        },
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  }

  // Bulk Import (for Python Excel importer)
  static async bulkImport(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId, names, role, grade, subject } = req.body;

      if (!schoolId || !names || !Array.isArray(names) || !role) {
        return res.status(400).json({
          error: "schoolId, role, and names (array) are required fields for bulk import.",
        });
      }

      if (!["admin", "teacher", "student", "coordinator"].includes(role)) {
        return res.status(400).json({ error: "Invalid role specified for bulk import." });
      }

      // Restrict to the platform owner or an admin of this specific school
      if (req.user?.role !== "owner" && (req.user?.role !== "admin" || req.user?.schoolId !== schoolId)) {
        return res.status(403).json({ error: "Access denied. You cannot import users into this school." });
      }

      const result = await UserService.bulkImportUsers(schoolId, names, role, { grade, subject });

      return res.status(200).json({
        message: "Bulk onboarding import completed.",
        schoolId,
        role,
        ...result,
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  }

  // Get all users for a school
  static async getUsersBySchool(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId } = req.params;

      // Restrict cross-tenant queries (unless platform owner)
      if (req.user?.role !== "owner" && (req.user?.role !== "admin" || req.user?.schoolId !== schoolId)) {
        return res.status(403).json({ error: "Access denied. You do not belong to this school." });
      }

      const users = await UserService.getUsersBySchool(schoolId);
      return res.status(200).json(users);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // Get single user profile
  static async getUserProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;

      const user = await UserService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: `User with ID '${userId}' not found.` });
      }

      // Allow same-school members (any role) or platform owner
      if (req.user?.role !== "owner" && req.user?.schoolId !== user.schoolId) {
        return res.status(403).json({ error: "Access denied. School data isolated." });
      }

      return res.status(200).json(user);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // Update user
  static async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const data = req.body;

      const user = await UserService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const isOwner = req.user?.role === "owner";
      const isSameSchoolAdmin = req.user?.role === "admin" && req.user?.schoolId === user.schoolId;
      const isSelf = req.user?.userId === userId;

      // Only allow owner, the user's own school admin, or self-update
      if (!isOwner && !isSameSchoolAdmin && !isSelf) {
        return res.status(403).json({ error: "Access denied. You cannot modify this user." });
      }

      // Prevent role escalation unless owner or the user's own school admin
      if (data.role && !isOwner && !isSameSchoolAdmin) {
        delete data.role;
      }
      if (data.permissions && !isOwner && !isSameSchoolAdmin) {
        delete data.permissions;
      }

      const updated = await UserService.updateUser(userId, data);
      return res.status(200).json({
        message: "User updated successfully",
        user: updated,
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  }

  // Delete user
  static async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;

      const user = await UserService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const isOwner = req.user?.role === "owner";
      const isSameSchoolAdmin = req.user?.role === "admin" && req.user?.schoolId === user.schoolId;
      const isSelf = req.user?.userId === userId;

      // Restrict to owner, the user's own school admin, or the user themselves (self-deletion)
      if (!isOwner && !isSameSchoolAdmin && !isSelf) {
        return res.status(403).json({ error: "Access denied. Admin permissions required to delete." });
      }

      await UserService.deleteUser(userId);
      return res.status(200).json({ message: "User deleted successfully." });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  // Upload profile image
  static async uploadProfileImage(req: AuthenticatedRequest, res: Response) {
    // Multer single file upload handler wrapped for custom errors
    const singleUpload = avatarUpload.single("profileImage");

    singleUpload(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: `Image upload rejected: ${err.message}` });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image file provided." });
      }

      try {
        const { userId } = req.params;

        const user = await UserService.getUserById(userId);
        if (!user) {
          // If user doesn't exist, remove uploaded file to clean space
          if (req.file && req.file.path) fs.unlinkSync(req.file.path);
          return res.status(404).json({ error: "User not found." });
        }

        // Restrict to owner, the user's own school admin, or self
        const isOwner = req.user?.role === "owner";
        const isSameSchoolAdmin = req.user?.role === "admin" && req.user?.schoolId === user.schoolId;
        const isSelf = req.user?.userId === userId;
        if (!isOwner && !isSameSchoolAdmin && !isSelf) {
          if (req.file && req.file.path) fs.unlinkSync(req.file.path);
          return res.status(403).json({ error: "Access denied. Cannot modify other users' profiles." });
        }

        // Generate virtual URL path (e.g. /uploads/avatars/filename)
        const imageUrl = `/uploads/avatars/${req.file.filename}`;

        // Save old profile image path to clean up
        const oldImage = user.profileImage;

        await UserService.updateUser(userId, { profileImage: imageUrl });

        // Delete old uploaded image if it was custom (don't delete the default asset)
        if (oldImage && oldImage.startsWith("/uploads/avatars/")) {
          const oldPath = path.join(process.cwd(), oldImage);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        return res.status(200).json({
          message: "Profile image updated successfully.",
          profileImage: imageUrl,
        });
      } catch (innerErr) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: (innerErr as Error).message });
      }
    });
  }

  // Reset profile image to default
  static async deleteProfileImage(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;

      const user = await UserService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // Restrict to owner, the user's own school admin, or self
      const isOwner = req.user?.role === "owner";
      const isSameSchoolAdmin = req.user?.role === "admin" && req.user?.schoolId === user.schoolId;
      const isSelf = req.user?.userId === userId;
      if (!isOwner && !isSameSchoolAdmin && !isSelf) {
        return res.status(403).json({ error: "Access denied. Cannot modify other users' profiles." });
      }

      const oldImage = user.profileImage;

      // Reset to default
      await UserService.updateUser(userId, { profileImage: "/public/defaults/dpfp.png" });

      // Clean up previous image if it was not the default one
      if (oldImage && oldImage.startsWith("/uploads/avatars/")) {
        const oldPath = path.join(process.cwd(), oldImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      return res.status(200).json({
        message: "Profile image reset to default.",
        profileImage: "/public/defaults/dpfp.png",
      });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }
}
