export interface School {
  schoolId: string;
  schoolName: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Permissions {
  canReadFiles: boolean;
  canUploadFiles: boolean;
  canDeleteFiles: boolean;
  canEditFiles: boolean;
  canManageUsers: boolean;
  allowedGrades?: string[];
  allowedSubjects?: string[];
}

export interface User {
  userId: string;
  schoolId: string;
  role: "admin" | "teacher" | "student" | "coordinator" | "owner";
  name: string;
  username: string;
  email: string;
  profileImage: string;
  grade?: string;
  subject?: string;
  permissions: Permissions;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecord {
  fileId: string;
  schoolId: string;
  uploadedBy: string;
  teacherId: string;
  grade?: string;
  subject?: string;
  title: string;
  description?: string;
  fileType: string;
  fileUrl: string;
  size?: number;
  category?: "resource" | "assignment" | "reading";
  permissions: {
    isPublicGlobal: boolean;
    allowedRoles: string[];
    allowedGrades: string[];
    allowedSubjects: string[];
  };
  createdAt: string;
  updatedAt: string;
}
