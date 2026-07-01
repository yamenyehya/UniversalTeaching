import { Request, Response } from "express";
import { UserService } from "../services/UserService.ts";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { schoolId, role, name, username, email, password, grade, subject } = req.body;

      if (!schoolId || !role || !name) {
        return res.status(400).json({ error: "SchoolId, role, and name are required fields." });
      }

      if (!["admin", "teacher", "student", "coordinator"].includes(role)) {
        return res.status(400).json({ error: "Invalid role specified." });
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

      // Generate JWT Token
      const token = jwt.sign(
        { userId: user.userId, role: user.role },
        process.env.JWT_SECRET || "PLATFORM_SUPER_SECRET_JWT_KEY",
        { expiresIn: "24h" }
      );

      return res.status(201).json({
        message: "User registered successfully",
        token,
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

  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
      }

      const user = await UserService.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      // Generate JWT Token
      const token = jwt.sign(
        { userId: user.userId, role: user.role },
        process.env.JWT_SECRET || "PLATFORM_SUPER_SECRET_JWT_KEY",
        { expiresIn: "24h" }
      );

      return res.status(200).json({
        message: "Login successful",
        token,
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
      return res.status(500).json({ error: (err as Error).message });
    }
  }
}
