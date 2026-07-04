import { Router } from "express";
import { AuthController } from "../controllers/AuthController.ts";
import { loginRateLimiter } from "../middleware/rateLimitMiddleware.ts";

const router = Router();

// NOTE: Public self-registration has been removed. Accounts are only ever
// created by the Owner (any school, any role) or a School Admin (their own
// school) via POST /api/users, POST /api/owner/users, or the bulk importer.
// An open /register endpoint accepting an arbitrary role would bypass the
// entire role hierarchy, so it does not exist here.

// POST /auth/login
router.post("/login", loginRateLimiter, AuthController.login);

export default router;
