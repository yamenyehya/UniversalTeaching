import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

// Paths for the fallback JSON database files
const DATA_DIR = path.join(process.cwd(), "backend", "data");
const SCHOOLS_FILE = path.join(DATA_DIR, "schools.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const FILES_FILE = path.join(DATA_DIR, "files.json");

// Ensure data directory and files exist
function ensureDirAndFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCHOOLS_FILE)) {
    fs.writeFileSync(SCHOOLS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(FILES_FILE)) {
    fs.writeFileSync(FILES_FILE, JSON.stringify([], null, 2));
  }
}

// Global flag to track if we are using MongoDB or Fallback
let isConnectedToMongo = false;

export async function connectDB(): Promise<boolean> {
  ensureDirAndFiles();
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("⚠️ MONGODB_URI not found in environment. Falling back to robust local JSON Database.");
    isConnectedToMongo = false;
    await seedDemoAccountsLocal();
    return false;
  }

  try {
    // 5-second timeout so it doesn't block the server from starting if connection fails
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("🚀 Connected to MongoDB successfully via Mongoose!");
    isConnectedToMongo = true;
    await seedDemoAccountsMongo();
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", (error as Error).message);
    console.warn("⚠️ Falling back to local JSON Database for live demo purposes.");
    isConnectedToMongo = false;
    await seedDemoAccountsLocal();
    return false;
  }
}

export function isUsingMongo(): boolean {
  return isConnectedToMongo && mongoose.connection.readyState === 1;
}

// Fallback JSON-based Database helper functions
export function readLocalJSON(filePath: string): any[] {
  ensureDirAndFiles();
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

export function writeLocalJSON(filePath: string, data: any[]): void {
  ensureDirAndFiles();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
  }
}

// Auto-seed required demo accounts on Local JSON Store
async function seedDemoAccountsLocal() {
  const users = readLocalJSON(USERS_FILE);
  const schools = readLocalJSON(SCHOOLS_FILE);

  // Check if default school exists
  const demoSchoolId = "demo-school";
  if (!schools.some((s) => s.schoolId === demoSchoolId)) {
    schools.push({
      schoolId: demoSchoolId,
      schoolName: "Demo International School",
      settings: { theme: "light" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    writeLocalJSON(SCHOOLS_FILE, schools);
  }

  // Seed user accounts if they don't exist
  const demoAccounts = [
    {
      userId: "owner-yamenyehya",
      schoolId: "global-platform",
      role: "owner" as const,
      name: "Yamen Yehya",
      username: "yamenyehya",
      email: "yamenyehya608@gmail.com",
      password: "yamen1234*",
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
    },
    {
      userId: "demo-admin",
      schoolId: demoSchoolId,
      role: "admin" as const,
      name: "System Administrator",
      username: "mainadmin",
      email: "admin@demoschool.edu",
      password: "1234",
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
    },
    {
      userId: "demo-student",
      schoolId: demoSchoolId,
      role: "student" as const,
      name: "John Student",
      username: "studentview",
      email: "student@demoschool.edu",
      password: "1234",
      grade: "Grade 10",
      profileImage: "/public/defaults/dpfp.png",
      permissions: {
        canReadFiles: true,
        canUploadFiles: false,
        canDeleteFiles: false,
        canEditFiles: false,
        canManageUsers: false,
        allowedGrades: ["Grade 10"],
        allowedSubjects: [],
      },
    },
    {
      userId: "demo-teacher",
      schoolId: demoSchoolId,
      role: "teacher" as const,
      name: "Sarah Teacher",
      username: "teacherview",
      email: "teacher@demoschool.edu",
      password: "1234",
      subject: "Mathematics",
      profileImage: "/public/defaults/dpfp.png",
      permissions: {
        canReadFiles: true,
        canUploadFiles: true,
        canDeleteFiles: true,
        canEditFiles: true,
        canManageUsers: false,
        allowedGrades: [],
        allowedSubjects: ["Mathematics"],
      },
    },
  ];

  let modified = false;
  for (const account of demoAccounts) {
    if (!users.some((u) => u.username === account.username)) {
      const passwordHash = await bcrypt.hash(account.password, 10);
      const { password, ...userData } = account;
      users.push({
        ...userData,
        passwordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      modified = true;
    }
  }

  if (modified) {
    writeLocalJSON(USERS_FILE, users);
    console.log("✅ Seeded required demo accounts in local JSON Store.");
  }
}

// Auto-seed required demo accounts on MongoDB
async function seedDemoAccountsMongo() {
  try {
    const School = mongoose.model("School");
    const User = mongoose.model("User");

    const demoSchoolId = "demo-school";
    let school = await School.findOne({ schoolId: demoSchoolId });
    if (!school) {
      school = await School.create({
        schoolId: demoSchoolId,
        schoolName: "Demo International School",
        settings: { theme: "light" },
      });
    }

    const demoAccounts = [
      {
        userId: "owner-yamenyehya",
        schoolId: "global-platform",
        role: "owner",
        name: "Yamen Yehya",
        username: "yamenyehya",
        email: "yamenyehya608@gmail.com",
        password: "yamen1234*",
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
      },
      {
        userId: "demo-admin",
        schoolId: demoSchoolId,
        role: "admin",
        name: "System Administrator",
        username: "mainadmin",
        email: "admin@demoschool.edu",
        password: "1234",
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
      },
      {
        userId: "demo-student",
        schoolId: demoSchoolId,
        role: "student",
        name: "John Student",
        username: "studentview",
        email: "student@demoschool.edu",
        password: "1234",
        grade: "Grade 10",
        profileImage: "/public/defaults/dpfp.png",
        permissions: {
          canReadFiles: true,
          canUploadFiles: false,
          canDeleteFiles: false,
          canEditFiles: false,
          canManageUsers: false,
          allowedGrades: ["Grade 10"],
          allowedSubjects: [],
        },
      },
      {
        userId: "demo-teacher",
        schoolId: demoSchoolId,
        role: "teacher",
        name: "Sarah Teacher",
        username: "teacherview",
        email: "teacher@demoschool.edu",
        password: "1234",
        subject: "Mathematics",
        profileImage: "/public/defaults/dpfp.png",
        permissions: {
          canReadFiles: true,
          canUploadFiles: true,
          canDeleteFiles: true,
          canEditFiles: true,
          canManageUsers: false,
          allowedGrades: [],
          allowedSubjects: ["Mathematics"],
        },
      },
    ];

    for (const account of demoAccounts) {
      const existingUser = await User.findOne({ username: account.username });
      if (!existingUser) {
        const passwordHash = await bcrypt.hash(account.password, 10);
        const { password, ...userData } = account;
        await User.create({
          ...userData,
          passwordHash,
        });
      }
    }
    console.log("✅ Seeded required demo accounts in MongoDB.");
  } catch (err) {
    console.error("❌ MongoDB seeding error:", err);
  }
}
