import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware.ts";

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Authentication required." });
    }

    if (req.user.role === "owner" || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: `Access forbidden. This operation requires one of these roles: ${allowedRoles.join(", ")}`,
    });
  };
};
