import { Request, Response } from "express";
import { UserService } from "../services/UserService.ts";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export class AuthController {
  // NOTE: public self-registration has been removed (see authRoutes.ts).
  // Account creation now happens exclusively through authenticated,
  // school-scoped endpoints in UserController / OwnerController.

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
        process.env.JWT_SECRET as string,
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
