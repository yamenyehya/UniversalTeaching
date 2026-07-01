import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload folders exist
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const AVATARS_DIR = path.join(UPLOAD_ROOT, "avatars");
const DOCUMENTS_DIR = path.join(UPLOAD_ROOT, "documents");

if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });
if (!fs.existsSync(DOCUMENTS_DIR)) fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });

// --- Multer Avatars Configuration ---
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATARS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const avatarFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid image format. Allowed: .png, .jpg, .jpeg, .webp"));
  }
};

const maxAvatarSize = parseInt(process.env.MAX_AVATAR_SIZE || "2097152", 10); // Default 2MB

export const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: maxAvatarSize,
  },
});

// --- Multer general Files Configuration ---
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCUMENTS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `doc-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const documentFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = [".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
    "image/png",
    "image/jpeg",
    "image/webp",
  ];

  if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format. Supported: .pdf, .docx, .xlsx, .png, .jpg, .jpeg, .webp"));
  }
};

const maxDocumentSize = parseInt(process.env.MAX_DOCUMENT_SIZE || "10485760", 10); // Default 10MB

export const documentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: maxDocumentSize,
  },
});
