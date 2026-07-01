import UserModel, { IPermissions } from "../models/User.ts";
import { isUsingMongo, readLocalJSON, writeLocalJSON } from "./db.ts";
import { SchoolService } from "./SchoolService.ts";
import bcrypt from "bcryptjs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

export class UserService {
  // Helper to generate a default password hash
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  // Generates default permissions based on role
  static getDefaultPermissions(role: string, extra: { grade?: string; subject?: string } = {}): IPermissions {
    switch (role) {
      case "admin":
        return {
          canReadFiles: true,
          canUploadFiles: true,
          canDeleteFiles: true,
          canEditFiles: true,
          canManageUsers: true,
          allowedGrades: [],
          allowedSubjects: [],
        };
      case "teacher":
        return {
          canReadFiles: true,
          canUploadFiles: true,
          canDeleteFiles: true,
          canEditFiles: true,
          canManageUsers: false,
          allowedGrades: [],
          allowedSubjects: extra.subject ? [extra.subject] : [],
        };
      case "coordinator":
      case "supervisor":
        return {
          canReadFiles: true,
          canUploadFiles: true,
          canDeleteFiles: false,
          canEditFiles: true,
          canManageUsers: false,
          allowedGrades: extra.grade ? [extra.grade] : [],
          allowedSubjects: extra.subject ? [extra.subject] : [],
        };
      case "student":
      default:
        return {
          canReadFiles: true,
          canUploadFiles: false,
          canDeleteFiles: false,
          canEditFiles: false,
          canManageUsers: false,
          allowedGrades: extra.grade ? [extra.grade] : [],
          allowedSubjects: [],
        };
    }
  }

  // Generates a unique username and email from a name
  static async generateUniqueUsernameAndEmail(
    name: string,
    schoolId: string,
    existingUsers: any[] = []
  ): Promise<{ username: string; email: string }> {
    // Sanitize name to lowercase alphanumeric
    let baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!baseUsername) baseUsername = "user";

    let username = baseUsername;
    let counter = 1;

    const usernameExists = async (u: string) => {
      if (isUsingMongo()) {
        const count = await (UserModel as any).countDocuments({ username: u });
        return count > 0;
      } else {
        return existingUsers.some((user) => user.username === u);
      }
    };

    while (await usernameExists(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Generate unique email
    let baseEmail = `${username}@${schoolId}.edu`;
    let email = baseEmail;
    counter = 1;

    const emailExists = async (e: string) => {
      if (isUsingMongo()) {
        const count = await (UserModel as any).countDocuments({ email: e });
        return count > 0;
      } else {
        return existingUsers.some((user) => user.email === e);
      }
    };

    while (await emailExists(email)) {
      email = `${username}${counter}@${schoolId}.edu`;
      counter++;
    }

    return { username, email };
  }

  static async createUser(userData: {
    schoolId: string;
    role: "admin" | "teacher" | "student" | "coordinator";
    name: string;
    username?: string;
    email?: string;
    password?: string;
    grade?: string;
    subject?: string;
    profileImage?: string;
  }) {
    // 1. Verify school exists
    const school = await SchoolService.getSchoolById(userData.schoolId);
    if (!school) {
      throw new Error(`School with ID '${userData.schoolId}' does not exist.`);
    }

    const defaultPass = userData.password || "1234";
    const passwordHash = await this.hashPassword(defaultPass);

    let finalUsername = userData.username;
    let finalEmail = userData.email;

    if (isUsingMongo()) {
      if (!finalUsername || !finalEmail) {
        const generated = await this.generateUniqueUsernameAndEmail(userData.name, userData.schoolId);
        if (!finalUsername) finalUsername = generated.username;
        if (!finalEmail) finalEmail = generated.email;
      }

      // Check duplicates
      const dupeUser = await (UserModel as any).findOne({
        $or: [{ username: finalUsername }, { email: finalEmail }],
      });
      if (dupeUser) {
        throw new Error("A user with this username or email already exists in MongoDB.");
      }

      const userId = "u_" + Math.random().toString(36).substr(2, 9);
      const permissions = this.getDefaultPermissions(userData.role, {
        grade: userData.grade,
        subject: userData.subject,
      });

      return await (UserModel as any).create({
        userId,
        schoolId: userData.schoolId,
        role: userData.role,
        name: userData.name,
        username: finalUsername,
        email: finalEmail,
        passwordHash,
        profileImage: userData.profileImage || "/public/defaults/dpfp.png",
        grade: userData.grade,
        subject: userData.subject,
        permissions,
      });
    } else {
      // JSON storage
      const users = readLocalJSON(USERS_FILE);

      if (!finalUsername || !finalEmail) {
        const generated = await this.generateUniqueUsernameAndEmail(userData.name, userData.schoolId, users);
        if (!finalUsername) finalUsername = generated.username;
        if (!finalEmail) finalEmail = generated.email;
      }

      if (users.some((u) => u.username === finalUsername || u.email === finalEmail)) {
        throw new Error("A user with this username or email already exists in Local Store.");
      }

      const userId = "u_" + Math.random().toString(36).substr(2, 9);
      const permissions = this.getDefaultPermissions(userData.role, {
        grade: userData.grade,
        subject: userData.subject,
      });

      const newUser = {
        userId,
        schoolId: userData.schoolId,
        role: userData.role,
        name: userData.name,
        username: finalUsername,
        email: finalEmail,
        passwordHash,
        profileImage: userData.profileImage || "/public/defaults/dpfp.png",
        grade: userData.grade,
        subject: userData.subject,
        permissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      users.push(newUser);
      writeLocalJSON(USERS_FILE, users);
      return newUser;
    }
  }

  static async bulkImportUsers(
    schoolId: string,
    names: string[],
    role: "admin" | "teacher" | "student" | "coordinator",
    options: { grade?: string; subject?: string } = {}
  ) {
    const school = await SchoolService.getSchoolById(schoolId);
    if (!school) {
      throw new Error(`School with ID '${schoolId}' does not exist.`);
    }

    const importedUsers: any[] = [];
    const errors: string[] = [];

    // Process one by one to ensure unique usernames/emails
    for (const name of names) {
      if (!name || !name.trim()) continue;
      try {
        const user = await this.createUser({
          schoolId,
          role,
          name: name.trim(),
          grade: options.grade,
          subject: options.subject,
        });
        importedUsers.push(user);
      } catch (err) {
        errors.push(`Error importing user '${name}': ${(err as Error).message}`);
      }
    }

    return {
      successCount: importedUsers.length,
      imported: importedUsers,
      errors,
    };
  }

  static async getUserById(userId: string) {
    if (isUsingMongo()) {
      return await (UserModel as any).findOne({ userId });
    } else {
      const users = readLocalJSON(USERS_FILE);
      return users.find((u) => u.userId === userId) || null;
    }
  }

  static async getUserByUsername(username: string) {
    if (isUsingMongo()) {
      return await (UserModel as any).findOne({ username });
    } else {
      const users = readLocalJSON(USERS_FILE);
      return users.find((u) => u.username === username) || null;
    }
  }

  static async getAllUsers() {
    if (isUsingMongo()) {
      return await (UserModel as any).find({});
    } else {
      return readLocalJSON(USERS_FILE);
    }
  }

  static async getUsersBySchool(schoolId: string) {
    if (isUsingMongo()) {
      return await (UserModel as any).find({ schoolId });
    } else {
      const users = readLocalJSON(USERS_FILE);
      return users.filter((u) => u.schoolId === schoolId);
    }
  }

  static async updateUser(userId: string, data: Partial<any>) {
    if (isUsingMongo()) {
      return await (UserModel as any).findOneAndUpdate({ userId }, { $set: data }, { new: true });
    } else {
      const users = readLocalJSON(USERS_FILE);
      const index = users.findIndex((u) => u.userId === userId);
      if (index === -1) return null;

      users[index] = {
        ...users[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      writeLocalJSON(USERS_FILE, users);
      return users[index];
    }
  }

  static async deleteUser(userId: string) {
    if (isUsingMongo()) {
      const result = await (UserModel as any).deleteOne({ userId });
      return result.deletedCount > 0;
    } else {
      const users = readLocalJSON(USERS_FILE);
      const originalLength = users.length;
      const filtered = users.filter((u) => u.userId !== userId);
      writeLocalJSON(USERS_FILE, filtered);
      return filtered.length < originalLength;
    }
  }
}
