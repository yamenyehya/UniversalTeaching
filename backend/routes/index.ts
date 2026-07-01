import { Router } from "express";
import authRoutes from "./authRoutes.ts";
import schoolRoutes from "./schoolRoutes.ts";
import userRoutes from "./userRoutes.ts";
import fileRoutes from "./fileRoutes.ts";
import ownerRoutes from "./ownerRoutes.ts";

const apiRouter = Router();

// Mount resources
apiRouter.use("/auth", authRoutes);
apiRouter.use("/schools", schoolRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/files", fileRoutes);
apiRouter.use("/owner", ownerRoutes);

export default apiRouter;
