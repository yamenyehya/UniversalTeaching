import mongoose, { Schema, Document } from "mongoose";

export interface IPermissions {
  canReadFiles: boolean;
  canUploadFiles: boolean;
  canDeleteFiles: boolean;
  canEditFiles: boolean;
  canManageUsers: boolean;
  allowedGrades?: string[];
  allowedSubjects?: string[];
}

export interface IUser extends Document {
  userId: string;
  schoolId: string;
  role: "admin" | "teacher" | "student" | "coordinator" | "owner";
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  profileImage: string;
  grade?: string; // For students & coordinators
  subject?: string; // For teachers & coordinators
  permissions: IPermissions;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    schoolId: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["admin", "teacher", "student", "coordinator", "owner"],
    },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    profileImage: { type: String, default: "/public/defaults/dpfp.png" },
    grade: { type: String },
    subject: { type: String },
    permissions: {
      canReadFiles: { type: Boolean, default: true },
      canUploadFiles: { type: Boolean, default: false },
      canDeleteFiles: { type: Boolean, default: false },
      canEditFiles: { type: Boolean, default: false },
      canManageUsers: { type: Boolean, default: false },
      allowedGrades: [{ type: String }],
      allowedSubjects: [{ type: String }],
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
