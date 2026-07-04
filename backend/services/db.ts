import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Production data layer.
 * MongoDB is the ONLY data source. There is no JSON/local-file fallback.
 * The server refuses to start if it cannot establish a MongoDB connection
 * or if required environment variables are missing.
 */

const REQUIRED_ENV_VARS = ["MONGODB_URI", "JWT_SECRET"] as const;

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key] || !process.env[key]!.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Refusing to start without them (no fallback mode is available).`
    );
  }

  if (process.env.JWT_SECRET === "PLATFORM_SUPER_SECRET_JWT_KEY") {
    throw new Error(
      "JWT_SECRET is set to the insecure default placeholder. Set a strong, unique secret before starting the server."
    );
  }
}

export async function connectDB(): Promise<void> {
  validateEnv();

  const uri = process.env.MONGODB_URI as string;

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });

  console.log("🚀 Connected to MongoDB successfully via Mongoose!");

  await seedOwnerAccount();
}

export function isUsingMongo(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Creates exactly one Owner account on first boot, sourced from environment
 * variables. No other accounts, schools, or demo data are ever auto-created.
 *
 * Required env vars: OWNER_NAME, OWNER_USERNAME, OWNER_EMAIL, OWNER_PASSWORD
 * If any are missing, owner seeding is skipped (an existing owner is left
 * untouched, and a fresh system will have no login until an owner is
 * provisioned via these variables and a restart).
 */
async function seedOwnerAccount(): Promise<void> {
  const UserModel = mongoose.model("User");

  const existingOwner = await (UserModel as any).findOne({ role: "owner" });
  if (existingOwner) {
    return;
  }

  const { OWNER_NAME, OWNER_USERNAME, OWNER_EMAIL, OWNER_PASSWORD } = process.env;

  if (!OWNER_NAME || !OWNER_USERNAME || !OWNER_EMAIL || !OWNER_PASSWORD) {
    console.warn(
      "⚠️ No Owner account exists yet, and OWNER_NAME / OWNER_USERNAME / OWNER_EMAIL / OWNER_PASSWORD " +
        "are not fully set. Skipping owner creation — set these environment variables and restart " +
        "the server to provision the platform Owner."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 10);
  const userId = "owner_" + Math.random().toString(36).substring(2, 10);

  await (UserModel as any).create({
    userId,
    schoolId: "global-platform",
    role: "owner",
    name: OWNER_NAME,
    username: OWNER_USERNAME,
    email: OWNER_EMAIL,
    passwordHash,
    profileImage: "/public/defaults/dpfp.png",
    permissions: {
      canReadFiles: true,
      canUploadFiles: true,
      canDeleteFiles: true,
      canEditFiles: true,
      canManageUsers: true,
      allowedGrades: [],
      allowedSubjects: [],
    },
  });

  console.log(`✅ Owner account provisioned for username '${OWNER_USERNAME}'.`);
}
