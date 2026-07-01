import mongoose, { Schema, Document } from "mongoose";

export interface IFilePermissions {
  isPublicGlobal: boolean; // Accessible by other schools (public library if any)
  allowedRoles: string[]; // Role restriction, e.g. ["student", "teacher", "coordinator"]
  allowedGrades?: string[]; // Grade restriction, e.g. ["Grade 10", "Grade 11"]
  allowedSubjects?: string[]; // Subject restriction, e.g. ["Math", "Physics"]
}

export interface IFile extends Document {
  fileId: string;
  schoolId: string;
  uploadedBy: string; // userId of teacher/admin who uploaded
  teacherId: string; // teacher's userId (for teacher-centric profile viewing)
  grade?: string; // Applicable grade level
  subject?: string; // Applicable subject
  title: string;
  description?: string;
  fileType: string; // e.g. pdf, docx, xlsx, png, jpg, etc.
  fileUrl: string; // Store path or public URL
  size?: number; // Size in bytes
  category?: string; // e.g. resource, assignment, reading
  permissions: IFilePermissions;
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema: Schema = new Schema(
  {
    fileId: { type: String, required: true, unique: true },
    schoolId: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    teacherId: { type: String, required: true },
    grade: { type: String },
    subject: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    fileType: { type: String, required: true },
    fileUrl: { type: String, required: true },
    size: { type: Number },
    category: { type: String, default: "resource" },
    permissions: {
      isPublicGlobal: { type: Boolean, default: false },
      allowedRoles: [{ type: String, default: ["student", "teacher", "coordinator", "admin"] }],
      allowedGrades: [{ type: String }],
      allowedSubjects: [{ type: String }],
    },
  },
  { timestamps: true }
);

export default mongoose.models.File || mongoose.model<IFile>("File", FileSchema);
