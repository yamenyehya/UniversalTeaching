import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserService } from "../services/UserService.ts";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    schoolId: string;
    role: "admin" | "teacher" | "student" | "coordinator" | "owner";
    name: string;
    username: string;
    email: string;
    grade?: string;
    subject?: string;
    permissions: any;
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      role: string;
    };

    const user = await UserService.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Invalid token. User not found." });
    }

    req.user = {
      userId: user.userId,
      schoolId: user.schoolId,
      role: user.role,
      name: user.name,
      username: user.username,
      email: user.email,
      grade: user.grade,
      subject: user.subject,
      permissions: user.permissions,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session token." });
  }
};
