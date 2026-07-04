import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { connectDB } from "./backend/services/db.ts";
import apiRouter from "./backend/routes/index.ts";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize DB Connection. MongoDB is the only supported data source —
  // if this fails, the server must not start (no JSON fallback exists).
  await connectDB();

  // Middleware for parsing JSON and form-data
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Expose local file uploads to the web client
  const uploadsPath = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsPath));

  // Expose public folder (contains /public/defaults/dpfp.png)
  const publicPath = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
  }
  app.use("/public", express.static(publicPath));

  // Mount modular API endpoints
  app.use("/api", apiRouter);

  // Serve static files in production or hook Vite development middleware in development
  if (process.env.NODE_ENV !== "production") {
    console.log("🛠️ Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("🚀 Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve Vite build bundle
    app.use(express.static(distPath));
    
    // Fallback all non-API paths to index.html for Single Page Application routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌍 Education platform running live at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("🔥 FAILED TO START SERVER:", err);
  process.exit(1);
});
