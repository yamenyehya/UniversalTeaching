import FileModel from "../models/File.ts";
import { SchoolService } from "./SchoolService.ts";

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

    // 2. Admin role has full access, but only within their own school
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

    const fileId = "f_" + Math.random().toString(36).substring(2, 11);
    const finalPermissions = {
      isPublicGlobal: fileData.permissions?.isPublicGlobal ?? false,
      allowedRoles: fileData.permissions?.allowedRoles ?? ["student", "teacher", "coordinator", "admin"],
      allowedGrades: fileData.permissions?.allowedGrades ?? (fileData.grade ? [fileData.grade] : []),
      allowedSubjects: fileData.permissions?.allowedSubjects ?? (fileData.subject ? [fileData.subject] : []),
    };

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
  }

  static async getFileById(fileId: string) {
    return await (FileModel as any).findOne({ fileId });
  }

  static async getAllFiles() {
    return await (FileModel as any).find({});
  }

  static async getFilesBySchool(schoolId: string) {
    return await (FileModel as any).find({ schoolId });
  }

  static async getFilesByTeacher(teacherId: string) {
    return await (FileModel as any).find({ teacherId });
  }

  static async updateFile(fileId: string, data: Partial<any>) {
    return await (FileModel as any).findOneAndUpdate({ fileId }, { $set: data }, { new: true });
  }

  static async deleteFile(fileId: string) {
    const result = await (FileModel as any).deleteOne({ fileId });
    return result.deletedCount > 0;
  }
}
