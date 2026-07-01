import FileModel from "../models/File.ts";
import { isUsingMongo, readLocalJSON, writeLocalJSON } from "./db.ts";
import { SchoolService } from "./SchoolService.ts";
import { UserService } from "./UserService.ts";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const FILES_FILE = path.join(DATA_DIR, "files.json");

export class FileService {
  // Checks if a user has permission to access or modify a file
  static hasPermission(
    user: { userId: string; role: string; schoolId: string; grade?: string; subject?: string },
    file: { schoolId: string; uploadedBy: string; grade?: string; subject?: string; permissions: any },
    action: "read" | "write" | "delete"
  ): boolean {
    // 0. Owner role has absolute global power
    if (user.role === "owner") {
      return true;
    }

    // 1. Cross-school isolation (unless file is explicitly public globally)
    if (user.schoolId !== file.schoolId && !file.permissions?.isPublicGlobal) {
      return false;
    }

    // 2. Admin role has absolute access
    if (user.role === "admin") {
      return true;
    }

    // 3. Deletion and modification permissions
    if (action === "write" || action === "delete") {
      // Owner can always write/delete
      if (file.uploadedBy === user.userId) {
        return true;
      }

      // Coordinators/Supervisors can write/delete files in their subject or grade
      if (user.role === "coordinator") {
        const allowedGrades = user.grade ? [user.grade] : [];
        const allowedSubjects = user.subject ? [user.subject] : [];

        const matchesGrade = !file.grade || allowedGrades.includes(file.grade);
        const matchesSubject = !file.subject || allowedSubjects.includes(file.subject);

        return matchesGrade && matchesSubject;
      }

      return false;
    }

    // 4. Reading files permissions
    if (action === "read") {
      // Allow if user is the uploader
      if (file.uploadedBy === user.userId) {
        return true;
      }

      // If there are role restrictions and user's role is not allowed
      const allowedRoles = file.permissions?.allowedRoles || ["student", "teacher", "coordinator", "admin"];
      if (!allowedRoles.includes(user.role)) {
        return false;
      }

      // Teacher/Coordinator role can read files within school by default
      if (user.role === "teacher" || user.role === "coordinator") {
        return true;
      }

      // For students, check grade/subject-level permissions
      if (user.role === "student") {
        const allowedGrades = file.permissions?.allowedGrades || [];
        const allowedSubjects = file.permissions?.allowedSubjects || [];

        // If file is grade-specific, student must match grade
        if (allowedGrades.length > 0 && user.grade && !allowedGrades.includes(user.grade)) {
          return false;
        }

        // If file has subject restrictions
        if (allowedSubjects.length > 0 && user.subject && !allowedSubjects.includes(user.subject)) {
          return false;
        }

        return true;
      }
    }

    return false;
  }

  static async createFile(fileData: {
    schoolId: string;
    uploadedBy: string;
    teacherId: string;
    title: string;
    description?: string;
    fileType: string;
    fileUrl: string;
    size?: number;
    grade?: string;
    subject?: string;
    category?: string;
    permissions?: {
      isPublicGlobal?: boolean;
      allowedRoles?: string[];
      allowedGrades?: string[];
      allowedSubjects?: string[];
    };
  }) {
    const school = await SchoolService.getSchoolById(fileData.schoolId);
    if (!school) {
      throw new Error(`School with ID '${fileData.schoolId}' does not exist.`);
    }

    const fileId = "f_" + Math.random().toString(36).substr(2, 9);
    const finalPermissions = {
      isPublicGlobal: fileData.permissions?.isPublicGlobal ?? false,
      allowedRoles: fileData.permissions?.allowedRoles ?? ["student", "teacher", "coordinator", "admin"],
      allowedGrades: fileData.permissions?.allowedGrades ?? (fileData.grade ? [fileData.grade] : []),
      allowedSubjects: fileData.permissions?.allowedSubjects ?? (fileData.subject ? [fileData.subject] : []),
    };

    if (isUsingMongo()) {
      return await (FileModel as any).create({
        fileId,
        schoolId: fileData.schoolId,
        uploadedBy: fileData.uploadedBy,
        teacherId: fileData.teacherId,
        title: fileData.title,
        description: fileData.description || "",
        fileType: fileData.fileType.toLowerCase(),
        fileUrl: fileData.fileUrl,
        size: fileData.size || 0,
        grade: fileData.grade,
        subject: fileData.subject,
        category: fileData.category || "resource",
        permissions: finalPermissions,
      });
    } else {
      const files = readLocalJSON(FILES_FILE);
      const newFile = {
        fileId,
        schoolId: fileData.schoolId,
        uploadedBy: fileData.uploadedBy,
        teacherId: fileData.teacherId,
        title: fileData.title,
        description: fileData.description || "",
        fileType: fileData.fileType.toLowerCase(),
        fileUrl: fileData.fileUrl,
        size: fileData.size || 0,
        grade: fileData.grade,
        subject: fileData.subject,
        category: fileData.category || "resource",
        permissions: finalPermissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      files.push(newFile);
      writeLocalJSON(FILES_FILE, files);
      return newFile;
    }
  }

  static async getFileById(fileId: string) {
    if (isUsingMongo()) {
      return await (FileModel as any).findOne({ fileId });
    } else {
      const files = readLocalJSON(FILES_FILE);
      return files.find((f) => f.fileId === fileId) || null;
    }
  }

  static async getAllFiles() {
    if (isUsingMongo()) {
      return await (FileModel as any).find({});
    } else {
      return readLocalJSON(FILES_FILE);
    }
  }

  static async getFilesBySchool(schoolId: string) {
    if (isUsingMongo()) {
      return await (FileModel as any).find({ schoolId });
    } else {
      const files = readLocalJSON(FILES_FILE);
      return files.filter((f) => f.schoolId === schoolId);
    }
  }

  static async getFilesByTeacher(teacherId: string) {
    if (isUsingMongo()) {
      return await (FileModel as any).find({ teacherId });
    } else {
      const files = readLocalJSON(FILES_FILE);
      return files.filter((f) => f.teacherId === teacherId);
    }
  }

  static async updateFile(fileId: string, data: Partial<any>) {
    if (isUsingMongo()) {
      return await (FileModel as any).findOneAndUpdate({ fileId }, { $set: data }, { new: true });
    } else {
      const files = readLocalJSON(FILES_FILE);
      const index = files.findIndex((f) => f.fileId === fileId);
      if (index === -1) return null;

      files[index] = {
        ...files[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      writeLocalJSON(FILES_FILE, files);
      return files[index];
    }
  }

  static async deleteFile(fileId: string) {
    if (isUsingMongo()) {
      const result = await (FileModel as any).deleteOne({ fileId });
      return result.deletedCount > 0;
    } else {
      const files = readLocalJSON(FILES_FILE);
      const originalLength = files.length;
      const filtered = files.filter((f) => f.fileId !== fileId);
      writeLocalJSON(FILES_FILE, filtered);
      return filtered.length < originalLength;
    }
  }
}
