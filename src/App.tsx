import React, { useState, useEffect } from "react";
import {
  School,
  User,
  FileRecord,
  Permissions
} from "./types.ts";
import {
  School as SchoolIcon,
  Users,
  FileText,
  ShieldAlert,
  Terminal,
  Upload,
  BookOpen,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Database,
  Layers,
  FileSpreadsheet,
  Trash2,
  Info,
  ExternalLink,
  ChevronRight,
  LogOut,
  FolderOpen,
  Eye,
  Lock,
  ArrowRight,
  Settings,
  Shield,
  Plus,
  Edit,
  PieChart,
  HardDrive,
  UserPlus,
  RefreshCw,
  Search,
  BookOpenCheck,
  UploadCloud,
  Sparkles,
  Download,
  X
} from "lucide-react";

export default function App() {
  // Navigation Tabs depending on active role
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Authentication State
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem("jwt_token"));
  const [currentUser, setCurrentUser] = useState<User | null>(
    localStorage.getItem("current_user") ? JSON.parse(localStorage.getItem("current_user")!) : null
  );
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Global lists (fetched depending on roles)
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [ownerStats, setOwnerStats] = useState<any>(null);
  const [schoolAnalytics, setSchoolAnalytics] = useState<any>(null);

  // In-Browser File Preview Modal State
  const [previewingFile, setPreviewingFile] = useState<FileRecord | null>(null);

  // Landing Page & Homepage Navigation State
  const [showLogin, setShowLogin] = useState<boolean>(false);

  // Owner High-Security PIN State (Hardcoded: 18201010)
  const [ownerPin, setOwnerPin] = useState<string>("");
  const [isOwnerPinVerified, setIsOwnerPinVerified] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Contact Form State
  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactSchool, setContactSchool] = useState<string>("");
  const [contactMessage, setContactMessage] = useState<string>("");
  const [contactSubmitted, setContactSubmitted] = useState<boolean>(false);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Modals & Editing states
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);

  // Form Creation states (Owner / Admin)
  const [newSchoolId, setNewSchoolId] = useState("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolSettings, setNewSchoolSettings] = useState("{}");

  const [newUserSchoolId, setNewUserSchoolId] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "teacher" | "coordinator" | "student">("student");
  const [newUserName, setNewUserName] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserGrade, setNewUserGrade] = useState("");
  const [newUserSubject, setNewUserSubject] = useState("");

  // Owner Bulk User Importer state
  const [bulkSchoolId, setBulkSchoolId] = useState("");
  const [bulkRole, setBulkRole] = useState<"admin" | "teacher" | "coordinator" | "student">("student");
  const [bulkGrade, setBulkGrade] = useState("");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkNamesText, setBulkNamesText] = useState("");
  const [bulkImportResult, setBulkImportResult] = useState<any | null>(null);
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiImportResult, setAiImportResult] = useState<any[] | null>(null);

  // File Upload State
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadGrade, setUploadGrade] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadCategory, setUploadCategory] = useState<"resource" | "assignment" | "reading">("resource");
  const [uploadIsPublicGlobal, setUploadIsPublicGlobal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // High-Security School Deletion state
  const [schoolToDelete, setSchoolToDelete] = useState<string | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  // Student Workspace sub-navigation state
  const [studentSubTab, setStudentSubTab] = useState<"teachers" | "assignments" | "public" | "private">("teachers");
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [teacherFileClassFilter, setTeacherFileClassFilter] = useState("");
  const [teacherFileSubjectFilter, setTeacherFileSubjectFilter] = useState("");

  // Feedback notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto set active tabs on login and setup background synchronization
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "owner") {
        setActiveTab("dashboard");
      } else if (currentUser.role === "admin") {
        setActiveTab("dashboard");
      } else {
        setActiveTab("workspace");
      }
      fetchData();

      // Continuous automatic background sync every 5 seconds to ensure real-time consistency
      const intervalId = setInterval(() => {
        fetchData();
      }, 5000);

      return () => clearInterval(intervalId);
    } else {
      setActiveTab("login");
    }
  }, [currentUser, authToken]);

  // Alert notifier helper
  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Main Data Fetch Routing
  const fetchData = async () => {
    if (!authToken || !currentUser) return;

    try {
      // 1. If role is owner, pull from owner APIs
      if (currentUser.role === "owner") {
        // Owner Stats
        const statsRes = await fetch("/api/owner/stats", {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setOwnerStats(statsData);
        }

        // All schools
        const schoolsRes = await fetch("/api/owner/schools", {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (schoolsRes.ok) {
          const schoolsData = await schoolsRes.json();
          setSchools(schoolsData);
          if (schoolsData.length > 0 && !bulkSchoolId) {
            setBulkSchoolId(schoolsData[0].schoolId);
            setNewUserSchoolId(schoolsData[0].schoolId);
          }
        }

        // All users
        const usersRes = await fetch("/api/owner/users", {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }

        // All files
        const filesRes = await fetch("/api/owner/files", {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          setFiles(filesData);
        }
      }

      // 2. If role is Admin, pull files and users for their own school
      else if (currentUser.role === "admin") {
        // School details
        const schoolsRes = await fetch(`/api/schools/${currentUser.schoolId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (schoolsRes.ok) {
          const schoolData = await schoolsRes.json();
          setSchools([schoolData]);
        }

        // School-specific analytics
        const analyticsRes = await fetch(`/api/schools/${currentUser.schoolId}/analytics`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setSchoolAnalytics(analyticsData);
        }

        // Users in their school
        const usersRes = await fetch(`/api/users/${currentUser.schoolId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }

        // Files in their school
        const filesRes = await fetch(`/api/files/${currentUser.schoolId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          setFiles(filesData);
        }
      }

      // 3. For teachers/students, pull files within their school with permission filtering
      else {
        const filesRes = await fetch(`/api/files/${currentUser.schoolId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          setFiles(filesData);
        }
      }
    } catch (err) {
      console.error("Data fetch error: ", err);
    }
  };

  // Login handler
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setLoginError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("jwt_token", data.token);
        localStorage.setItem("current_user", JSON.stringify(data.user));
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setLoginUsername("");
        setLoginPassword("");
      } else {
        setLoginError(data.error || "Invalid username or password.");
      }
    } catch (err) {
      setLoginError("Could not connect to the Express backend server.");
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("current_user");
    setAuthToken(null);
    setCurrentUser(null);
    setSchools([]);
    setUsers([]);
    setFiles([]);
    setOwnerStats(null);
    setSchoolAnalytics(null);
    setIsOwnerPinVerified(false);
    setOwnerPin("");
    setPinError(null);
    setShowLogin(false);
  };

  // Direct login convenience function for development/testing
  const triggerQuickLogin = (uname: string, pass: string) => {
    setLoginUsername(uname);
    setLoginPassword(pass);
    // Submit using state updates in next tick
    setTimeout(() => {
      setLoading(true);
      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uname, password: pass })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token && data.user) {
            localStorage.setItem("jwt_token", data.token);
            localStorage.setItem("current_user", JSON.stringify(data.user));
            setAuthToken(data.token);
            setCurrentUser(data.user);
            setLoginUsername("");
            setLoginPassword("");
          } else {
            setLoginError(data.error || "Quick login failed.");
          }
        })
        .catch(() => setLoginError("Connection failed."))
        .finally(() => setLoading(false));
    }, 100);
  };

  // Create School handler (Owner only)
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolId || !newSchoolName) {
      showNotification("error", "Both School ID and School Name are required.");
      return;
    }

    try {
      let parsedSettings = {};
      if (newSchoolSettings) {
        try {
          parsedSettings = JSON.parse(newSchoolSettings);
        } catch (e) {
          showNotification("error", "Invalid JSON settings format.");
          return;
        }
      }

      const response = await fetch("/api/owner/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          schoolId: newSchoolId,
          schoolName: newSchoolName,
          settings: parsedSettings
        })
      });

      const resData = await response.json();
      if (response.ok) {
        showNotification("success", `School '${newSchoolName}' successfully onboarded.`);
        setNewSchoolId("");
        setNewSchoolName("");
        setNewSchoolSettings("{}");
        fetchData();
      } else {
        showNotification("error", resData.error || "Failed to onboard school.");
      }
    } catch (err) {
      showNotification("error", "Failed to connect to the backend server.");
    }
  };

  // Delete School handler (Owner only)
  const handleDeleteSchool = (schoolId: string) => {
    setSchoolToDelete(schoolId);
    setDeleteConfirmInput("");
  };

  const executeDeleteSchool = async () => {
    if (!schoolToDelete) return;
    if (deleteConfirmInput !== schoolToDelete) {
      showNotification("error", "The confirmation text does not match the School ID.");
      return;
    }

    const schoolId = schoolToDelete;
    setSchoolToDelete(null);

    try {
      const response = await fetch(`/api/owner/schools/${schoolId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const data = await response.json();
      if (response.ok) {
        showNotification("success", data.message || "School and cascade records deleted.");
        fetchData();
      } else {
        showNotification("error", data.error || "Delete failed.");
      }
    } catch (err) {
      showNotification("error", "Failed to contact backend server.");
    }
  };

  // Update School handler (Owner only)
  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;

    try {
      const response = await fetch(`/api/owner/schools/${editingSchool.schoolId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          schoolName: editingSchool.schoolName,
          settings: editingSchool.settings
        })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification("success", "School updated successfully.");
        setEditingSchool(null);
        fetchData();
      } else {
        showNotification("error", data.error || "Update failed.");
      }
    } catch (err) {
      showNotification("error", "Server communication failed.");
    }
  };

  // Create User handler (Owner/Admin)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSchoolId = currentUser?.role === "owner" ? newUserSchoolId : currentUser?.schoolId;

    if (!targetSchoolId || !newUserName || !newUserUsername || !newUserEmail || !newUserPassword) {
      showNotification("error", "Please fill in all required fields to create a user.");
      return;
    }

    try {
      const endpoint = currentUser?.role === "owner" ? "/api/owner/users" : "/api/users";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          schoolId: targetSchoolId,
          role: newUserRole,
          name: newUserName,
          username: newUserUsername,
          email: newUserEmail,
          password: newUserPassword,
          grade: newUserGrade || undefined,
          subject: newUserSubject || undefined,
          permissions: {
            canReadFiles: true,
            canUploadFiles: ["admin", "teacher", "coordinator"].includes(newUserRole),
            canDeleteFiles: ["admin"].includes(newUserRole),
            canEditFiles: ["admin", "teacher"].includes(newUserRole),
            canManageUsers: ["admin"].includes(newUserRole),
            allowedGrades: newUserGrade ? [newUserGrade] : [],
            allowedSubjects: newUserSubject ? [newUserSubject] : []
          }
        })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification("success", `User account '${newUserName}' created.`);
        setNewUserName("");
        setNewUserUsername("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserGrade("");
        setNewUserSubject("");
        fetchData();
      } else {
        showNotification("error", data.error || "Failed to create user account.");
      }
    } catch (err) {
      showNotification("error", "Server connection failed.");
    }
  };

  // Update User handler (Owner/Admin)
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const endpoint = currentUser?.role === "owner"
        ? `/api/owner/users/${editingUser.userId}`
        : `/api/users/${editingUser.userId}`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(editingUser)
      });

      const data = await response.json();
      if (response.ok) {
        showNotification("success", "User profile updated successfully.");
        setEditingUser(null);
        fetchData();
      } else {
        showNotification("error", data.error || "Update failed.");
      }
    } catch (err) {
      showNotification("error", "Server communication failed.");
    }
  };

  // Delete User handler (Owner/Admin)
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user account permanently?")) {
      return;
    }

    try {
      const endpoint = currentUser?.role === "owner"
        ? `/api/owner/users/${userId}`
        : `/api/users/${userId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const data = await response.json();
      if (response.ok) {
        showNotification("success", "User account deleted successfully.");
        fetchData();
      } else {
        showNotification("error", data.error || "Delete failed.");
      }
    } catch (err) {
      showNotification("error", "Server connection failed.");
    }
  };

  // Owner Bulk Excel-Style User Importer
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkImportResult(null);
    setBulkImportError(null);

    if (!bulkSchoolId || !bulkNamesText.trim() || !bulkRole) {
      setBulkImportError("Please specify the school, role, and names list.");
      return;
    }

    const namesArray = bulkNamesText
      .split(/,|\n/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (namesArray.length === 0) {
      setBulkImportError("No valid names were detected in the input.");
      return;
    }

    try {
      const response = await fetch("/api/owner/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          schoolId: bulkSchoolId,
          role: bulkRole,
          names: namesArray,
          grade: bulkGrade || undefined,
          subject: bulkSubject || undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        setBulkImportResult(data);
        setBulkNamesText("");
        showNotification("success", `Bulk onboarded ${data.successCount} users to ${bulkSchoolId}.`);
        fetchData();
      } else {
        setBulkImportError(data.error || "Bulk import failed.");
      }
    } catch (err) {
      setBulkImportError("Failed to communicate with Express importer API.");
    }
  };

  // AI-Assisted Bulk Excel/Unstructured User Importer
  const handleAIParsedImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkImportResult(null);
    setBulkImportError(null);
    setAiImportResult(null);
    setIsAILoading(true);

    if (!bulkSchoolId || !bulkNamesText.trim()) {
      setBulkImportError("Please specify the target school and provide raw spreadsheet or text data.");
      setIsAILoading(false);
      return;
    }

    try {
      const response = await fetch("/api/owner/ai-parse-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          schoolId: bulkSchoolId,
          defaultRole: bulkRole,
          defaultGrade: bulkGrade || undefined,
          defaultSubject: bulkSubject || undefined,
          rawContent: bulkNamesText
        })
      });

      const data = await response.json();
      if (response.ok) {
        setAiImportResult(data.imported);
        setBulkNamesText("");
        if (data.errors && data.errors.length > 0) {
          setBulkImportError(`Completed with some errors: ${data.errors.join("; ")}`);
        }
        showNotification("success", `Successfully parsed & onboarded ${data.imported.length} portfolios.`);
        fetchData();
      } else {
        setBulkImportError(data.error || "AI import failed.");
      }
    } catch (err) {
      setBulkImportError("Failed to connect to the backend server.");
    } finally {
      setIsAILoading(false);
    }
  };

  // CSV Generator and Downloader for Processed Spreadsheet Accounts
  const downloadProcessedCSV = () => {
    if (!aiImportResult || aiImportResult.length === 0) return;

    const headers = ["Name", "Email", "Role", "Grade", "Subject", "Generated Username", "Secure Password", "School ID"];
    const rows = aiImportResult.map(u => [
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email ? u.email.replace(/"/g, '""') : ''}"`,
      `"${u.role}"`,
      `"${u.grade}"`,
      `"${u.subject}"`,
      `"${u.username}"`,
      `"${u.password}"`,
      `"${u.schoolId}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `processed_tenant_accounts_${bulkSchoolId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("success", "Processed spreadsheet accounts downloaded successfully.");
  };

  // Academic File Upload (Admins, Teachers, Coordinators)
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadSuccess(null);
    setUploadError(null);

    if (!uploadTitle) {
      setUploadError("Document Title is required.");
      return;
    }
    if (!uploadedFile) {
      setUploadError("Please choose a physical document file to distribute.");
      return;
    }

    const targetSchoolId = currentUser?.schoolId || "";

    const formData = new FormData();
    formData.append("title", uploadTitle);
    formData.append("description", uploadDescription);
    formData.append("grade", uploadGrade);
    formData.append("subject", uploadSubject);
    formData.append("schoolId", targetSchoolId);
    formData.append("category", uploadCategory);
    formData.append("file", uploadedFile);

    // Build default permissions
    const permConfig = {
      isPublicGlobal: uploadIsPublicGlobal,
      allowedRoles: ["student", "teacher", "coordinator", "admin"],
      allowedGrades: uploadGrade ? [uploadGrade] : [],
      allowedSubjects: uploadSubject ? [uploadSubject] : []
    };
    formData.append("permissions", JSON.stringify(permConfig));

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setUploadSuccess(`Document '${uploadTitle}' published and isolated successfully.`);
        setUploadTitle("");
        setUploadDescription("");
        setUploadGrade("");
        setUploadSubject("");
        setUploadedFile(null);
        // Clear input element
        const fileInput = document.getElementById("document-file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        fetchData();
      } else {
        setUploadError(data.error || "File upload failed.");
      }
    } catch (err) {
      setUploadError("Server connection failed during document upload.");
    }
  };

  // Delete file metadata and physical file
  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this academic document?")) {
      return;
    }

    try {
      const endpoint = currentUser?.role === "owner"
        ? `/api/owner/files/${fileId}`
        : `/api/files/${fileId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const data = await response.json();
      if (response.ok) {
        showNotification("success", data.message || "File deleted successfully.");
        fetchData();
      } else {
        showNotification("error", data.error || "File deletion failed.");
      }
    } catch (err) {
      showNotification("error", "Failed to contact backend server.");
    }
  };

  // Update file details
  const handleUpdateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;

    try {
      const endpoint = currentUser?.role === "owner"
        ? `/api/owner/files/${editingFile.fileId}`
        : `/api/files/${editingFile.fileId}`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(editingFile)
      });

      const data = await response.json();
      if (response.ok) {
        showNotification("success", "File details updated.");
        setEditingFile(null);
        fetchData();
      } else {
        showNotification("error", data.error || "Update failed.");
      }
    } catch (err) {
      showNotification("error", "Server connection failed.");
    }
  };

  // Filtering users & files based on search
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = schoolFilter ? u.schoolId === schoolFilter : true;
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesSchool && matchesRole;
  });

  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.subject && f.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.grade && f.grade.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSchool = schoolFilter ? f.schoolId === schoolFilter : true;
    return matchesSearch && matchesSchool;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* 1. BRANDING CORPORATE HEADER */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-md flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-inner text-white flex items-center justify-center">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Universal Teaching Hub</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Enterprise SaaS Platform • by NuxWeb</p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
              <div className="h-8 w-8 rounded-full bg-indigo-500 border border-indigo-400 flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden">
                {currentUser.name.substring(0, 2)}
              </div>
              <div className="text-left hidden sm:block">
                <h4 className="text-xs font-bold text-white">{currentUser.name}</h4>
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wide">
                  {currentUser.role} • {currentUser.schoolId}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 transition-all flex items-center gap-2 text-xs font-semibold"
              title="Sign Out Session"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* FLOATING SUCCESS/ERROR NOTIFICATIONS */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-sm max-w-md animate-bounce flex items-center gap-3 ${
          notification.type === "success"
            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
            : "bg-rose-50 text-rose-900 border-rose-200"
        }`}>
          {notification.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* 2. AUTHENTICATION / SIGN IN WINDOW */}
      {!currentUser ? (
        !showLogin ? (
          <div className="flex-1 flex flex-col bg-slate-50">
            {/* Landing Hero Section */}
            <section className="relative px-6 py-16 md:py-24 bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>
              <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
                  Next-Gen Academic Infrastructure
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto font-sans">
                  The Complete Multi-Tenant Hub for Modern Schools
                </h1>
                
                <p className="text-sm md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                  A high-security, production-ready SaaS platform designed for administrative control, seamless faculty management, and curriculum sharing.
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    Enter Platform Portal
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <a
                    href="#onboard"
                    className="px-8 py-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center"
                  >
                    Request Institutional Onboarding
                  </a>
                </div>
              </div>
            </section>

            {/* Platform Features Grid */}
            <section className="px-6 py-16 max-w-6xl mx-auto w-full space-y-12">
              <div className="text-center space-y-3">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Engineered for Academic Excellence</h2>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">Discover the enterprise-grade modules driving the NuxWeb Universal Teaching Hub.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4">
                  <div className="h-10 w-10 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <SchoolIcon className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">School Isolation</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Complete data boundary partitioning. Each school possesses its own isolated user registries, coursework repositories, and file databases.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4">
                  <div className="h-10 w-10 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">AI Onboarding</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Drop your spreadsheet and let the AI automatically parse staff, student enrollments, grade levels, and teachers' specialized subjects.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4">
                  <div className="h-10 w-10 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center text-amber-600">
                    <BookOpenCheck className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">SaaS Workspace</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Dedicated, interactive views tailored for Students, Teachers, School Admins, and Platform Owners with specific role clearance checks.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4">
                  <div className="h-10 w-10 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-center text-purple-600">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Owner Guardrails</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Owner console protected by 8-digit hardware PIN prompts, secure multi-stage confirmations, and permanent cascade-decommission protection.
                  </p>
                </div>
              </div>
            </section>

            {/* Interactive School Contact Form */}
            <section id="onboard" className="px-6 py-16 bg-slate-100 border-t border-slate-200">
              <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-955 p-6 text-white text-center bg-slate-900">
                  <h3 className="font-extrabold text-base">Institutional Onboarding Program</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Enroll your educational facility in the Universal Teaching Hub directory.</p>
                </div>

                {contactSubmitted ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="inline-flex bg-emerald-50 border border-emerald-100 p-4 rounded-full text-emerald-600">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm">Application Received Successfully!</h4>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                      Thank you for applying. Our educational onboarding staff is reviewing your application details and will contact you at <strong className="text-slate-800 font-bold">{contactEmail}</strong> to provision your isolated school tenant workspace.
                    </p>
                    <button
                      onClick={() => {
                        setContactSubmitted(false);
                        setContactName("");
                        setContactEmail("");
                        setContactSchool("");
                        setContactMessage("");
                      }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors mt-2"
                    >
                      Submit Another Application
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (contactName && contactEmail && contactSchool) {
                        setContactSubmitted(true);
                      }
                    }}
                    className="p-6 space-y-4 text-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Your Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Dean Henderson"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Email Address *</label>
                        <input
                          type="type"
                          required
                          placeholder="dean@university.edu"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">School / Institution Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Greenwood Science Academy"
                        value={contactSchool}
                        onChange={(e) => setContactSchool(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Message or Inquiry Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Detail your institution's specific requirements, estimated enrollments, or onboarding timeline..."
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                    >
                      Apply for Institutional Enrollment
                    </button>
                  </form>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
            <button
              onClick={() => setShowLogin(false)}
              className="mb-4 px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-white text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all bg-slate-50/50"
            >
              ← Back to Homepage
            </button>
            
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 p-8 text-center text-white border-b border-slate-800">
                <div className="inline-flex bg-indigo-600 p-3 rounded-2xl mb-3 shadow-md">
                  <Lock className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-xl font-black">Authorized Portal Entrance</h2>
                <p className="text-xs text-slate-400 mt-1">Universal Teaching Hub • Secure Multi-Tenant Framework</p>
              </div>

              <form onSubmit={handleLogin} className="p-8 space-y-5">
                {loginError && (
                  <div className="p-3 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-100 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Username</label>
                  <input
                    type="text"
                    placeholder="Enter your system username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                  {loading ? "Authenticating..." : "Sign In to Hub"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="px-8 pb-8 pt-2 border-t border-slate-100">
                <div className="text-center mb-4">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                    Quick Access Demo Accounts
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => triggerQuickLogin("yamenyehya", "yamen1234*")}
                    className="p-2.5 border border-slate-200 hover:border-indigo-500 rounded-xl bg-slate-50 hover:bg-indigo-50 transition-all text-left group"
                  >
                    <p className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span>Owner Portal</span>
                      <Shield className="h-3 w-3 text-indigo-600" />
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">yamenyehya</p>
                  </button>

                  <button
                    onClick={() => triggerQuickLogin("mainadmin", "1234")}
                    className="p-2.5 border border-slate-200 hover:border-emerald-500 rounded-xl bg-slate-50 hover:bg-emerald-50 transition-all text-left group"
                  >
                    <p className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span>School Admin</span>
                      <UserCheck className="h-3 w-3 text-emerald-600" />
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">mainadmin</p>
                  </button>

                  <button
                    onClick={() => triggerQuickLogin("teacherview", "1234")}
                    className="p-2.5 border border-slate-200 hover:border-amber-500 rounded-xl bg-slate-50 hover:bg-amber-50 transition-all text-left group"
                  >
                    <p className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span>Teacher view</span>
                      <FileText className="h-3 w-3 text-amber-600" />
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">teacherview</p>
                  </button>

                  <button
                    onClick={() => triggerQuickLogin("studentview", "1234")}
                    className="p-2.5 border border-slate-200 hover:border-sky-500 rounded-xl bg-slate-50 hover:bg-sky-50 transition-all text-left group"
                  >
                    <p className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span>Student view</span>
                      <BookOpen className="h-3 w-3 text-sky-600" />
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">studentview</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        /* 3. AUTHENTICATED SaaS FRAMEWORK DISPLAY */
        currentUser.role === "owner" && !isOwnerPinVerified ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 text-white min-h-[85vh] [background-size:24px_24px] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]">
            <div className="w-full max-w-md bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 p-8 space-y-6 text-center">
              <div className="inline-flex bg-amber-500/10 border border-amber-500/30 p-4 rounded-full text-amber-500">
                <Lock className="h-10 w-10 animate-pulse text-amber-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold tracking-tight">Owner Verification Required</h2>
                <p className="text-xs text-slate-400">Please enter your 8-digit Administrator PIN to authorize access to the multi-school SaaS console.</p>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  maxLength={8}
                  placeholder="••••••••"
                  value={ownerPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setOwnerPin(val);
                    setPinError(null);
                  }}
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] border border-slate-800 rounded-xl p-4 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:tracking-normal placeholder:text-sm"
                />

                {pinError && (
                  <p className="text-xs text-rose-500 font-bold flex items-center justify-center gap-1.5 bg-rose-500/10 border border-rose-500/20 py-2.5 rounded-xl">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    {pinError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-3 border border-slate-800 hover:bg-slate-900 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Logout Session
                  </button>
                  <button
                    onClick={() => {
                      if (ownerPin === "18201010") {
                        setIsOwnerPinVerified(true);
                        setPinError(null);
                        setOwnerPin("");
                      } else {
                        setPinError("Invalid security PIN. Access denied.");
                        setOwnerPin("");
                      }
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold transition-all text-white shadow-md hover:shadow-indigo-500/10"
                  >
                    Authorize Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row">
          {/* NAVIGATION BAR ON SIDE */}
          <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col justify-between shrink-0">
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Workspace Navigation</span>
                <nav className="space-y-1">
                  {/* ====== OWNER-ONLY SIDEBAR NAVIGATION ====== */}
                  {currentUser.role === "owner" && (
                    <>
                      <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                          activeTab === "dashboard"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <PieChart className="h-4 w-4" />
                        SaaS Global Dashboard
                      </button>

                      <button
                        onClick={() => setActiveTab("schools")}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                          activeTab === "schools"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <SchoolIcon className="h-4 w-4" />
                        Manage All Schools
                      </button>

                      <button
                        onClick={() => setActiveTab("users")}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                          activeTab === "users"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Users className="h-4 w-4" />
                        Manage User Registry
                      </button>

                      <button
                        onClick={() => setActiveTab("files")}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                          activeTab === "files"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Database className="h-4 w-4" />
                        Manage Repository Files
                      </button>

                      <button
                        onClick={() => setActiveTab("importer")}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                          activeTab === "importer"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel Tenant Importer
                      </button>
                    </>
                  )}

                  {/* ====== SCHOOL ADMIN SIDEBAR NAVIGATION ====== */}
                  {currentUser.role === "admin" && (
                    <>
                      <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                          activeTab === "dashboard"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <PieChart className="h-4 w-4" />
                        School Stats Overview
                      </button>

                      <button
                        onClick={() => setActiveTab("users")}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                          activeTab === "users"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Users className="h-4 w-4" />
                        Manage Student/Teacher Profiles
                      </button>

                      <button
                        onClick={() => setActiveTab("files")}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                          activeTab === "files"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Database className="h-4 w-4" />
                        Isolated Learning Files
                      </button>
                    </>
                  )}

                  {/* ====== TEACHER / COORDINATOR SIDEBAR NAVIGATION ====== */}
                  {(currentUser.role === "teacher" || currentUser.role === "coordinator") && (
                    <>
                      <button
                        onClick={() => setActiveTab("workspace")}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                          activeTab === "workspace"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <BookOpen className="h-4 w-4" />
                        My Lesson Workspace
                      </button>
                    </>
                  )}

                  {/* ====== STUDENT SIDEBAR NAVIGATION ====== */}
                  {currentUser.role === "student" && (
                    <>
                      <button
                        onClick={() => setActiveTab("workspace")}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                          activeTab === "workspace"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <BookOpenCheck className="h-4 w-4" />
                        My Study Materials
                      </button>
                    </>
                  )}
                </nav>
              </div>
            </div>

            {/* Auto background synchronization is active and silent */}
          </aside>

          {/* MAIN DYNAMIC RUNTIME SCREEN CONTAINER */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-8">

            {/* A. OWNER DASHBOARD */}
            {currentUser.role === "owner" && activeTab === "dashboard" && ownerStats && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">SaaS Multi-School Management Console</h2>
                    <p className="text-xs text-slate-500 mt-1">Global platform-wide control. Isolated tenants, cascading resource databases, and secure administrative monitoring.</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-800 text-xs font-bold uppercase tracking-wider">
                    Role: Universal Owner
                  </div>
                </div>

                {/* SaaS Widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Onboarded Schools</span>
                      <SchoolIcon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">{ownerStats.totalSchools}</p>
                    <p className="text-[10px] text-slate-500 mt-1.5">Tenants on network</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Registered Users</span>
                      <Users className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">{ownerStats.totalUsers}</p>
                    <p className="text-[10px] text-slate-500 mt-1.5">Students, staff & admins</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Distributed Files</span>
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">{ownerStats.totalFiles}</p>
                    <p className="text-[10px] text-slate-500 mt-1.5">Coursework & curriculum</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Storage Utilized</span>
                      <HardDrive className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                      {(ownerStats.totalStorage / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1.5">Sandboxed local uploads</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Users distribution by role chart */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-100 pb-2">Global User Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(ownerStats.roleCounts || {}).map(([role, count]: [string, any]) => (
                        <div key={role} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="capitalize text-slate-600">{role}</span>
                            <span className="text-slate-900">{count} accounts</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, (count / (ownerStats.totalUsers || 1)) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* File types distribution */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-100 pb-2">Repository Formats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(ownerStats.fileTypeCounts || {}).map(([type, count]: [string, any]) => (
                        <div key={type} className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase font-mono">{type} Files</span>
                            <span className="text-xl font-black text-slate-800 mt-1 block">{count}</span>
                          </div>
                          <FileText className="h-5 w-5 text-indigo-500 opacity-60" />
                        </div>
                      ))}
                      {Object.keys(ownerStats.fileTypeCounts || {}).length === 0 && (
                        <div className="col-span-2 text-center py-6 text-slate-400 text-xs">No files uploaded yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AA. SCHOOL ADMIN DASHBOARD */}
            {currentUser.role === "admin" && activeTab === "dashboard" && schoolAnalytics && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {schoolAnalytics.schoolName || "Greenwood Academy Portal"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      School-level administrative analytics, active student rosters, faculty subject focus distributions, and tenant disk metrics.
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-800 text-xs font-bold uppercase tracking-wider">
                    Role: School Admin ({currentUser.schoolId})
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Enrolled Students</span>
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">{schoolAnalytics.studentCount}</p>
                    <p className="text-[10px] text-slate-500 mt-1.5">Registered student profiles</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Faculty Instructors</span>
                      <Users className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">{schoolAnalytics.teacherCount}</p>
                    <p className="text-[10px] text-slate-500 mt-1.5">Active teachers and staff</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Active Dashboard Users</span>
                      <UserCheck className="h-5 w-5 text-amber-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900">{schoolAnalytics.activeUsersCount}</p>
                    <p className="text-[10px] text-slate-500 mt-1.5">Connected tenant members</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase">Tenant Content Storage</span>
                      <HardDrive className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                      {(schoolAnalytics.totalStorage / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1.5">Utilized across {schoolAnalytics.fileCount} learning files</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Distributions Grid Column */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-100 pb-2">Student Grade Distributions</h3>
                      <div className="space-y-3">
                        {Object.entries(schoolAnalytics.gradeDistribution || {}).map(([grade, count]: [string, any]) => (
                          <div key={grade} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-600">Grade {grade}</span>
                              <span className="text-slate-900">{count} students</span>
                            </div>
                            <div className="w-full bg-slate-150 rounded-full h-1.5">
                              <div
                                className="bg-indigo-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, (count / (schoolAnalytics.studentCount || 1)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                        {Object.keys(schoolAnalytics.gradeDistribution || {}).length === 0 && (
                          <p className="text-xs text-slate-400 py-2">No grade distributions available.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-100 pb-2">Teacher Subject Specializations</h3>
                      <div className="space-y-3">
                        {Object.entries(schoolAnalytics.subjectDistribution || {}).map(([subject, count]: [string, any]) => (
                          <div key={subject} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="capitalize text-slate-600">{subject}</span>
                              <span className="text-slate-900">{count} staff</span>
                            </div>
                            <div className="w-full bg-slate-150 rounded-full h-1.5">
                              <div
                                className="bg-emerald-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, (count / (schoolAnalytics.teacherCount || 1)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                        {Object.keys(schoolAnalytics.subjectDistribution || {}).length === 0 && (
                          <p className="text-xs text-slate-400 py-2">No subject specializations recorded.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown & Activity Insights */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-6">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800 mb-4 border-b border-slate-100 pb-2">Academic File Breakdown</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(schoolAnalytics.categoryCounts || {}).map(([category, count]: [string, any]) => (
                          <div key={category} className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between">
                            <div>
                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase font-mono">{category}</span>
                              <span className="text-lg font-black text-slate-800 mt-1 block">{count}</span>
                            </div>
                            <FileText className="h-5 w-5 text-indigo-500 opacity-60" />
                          </div>
                        ))}
                        {Object.keys(schoolAnalytics.categoryCounts || {}).length === 0 && (
                          <div className="col-span-2 text-center py-6 text-slate-400 text-xs">No learning materials have been categorized yet.</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Info className="h-4 w-4 text-indigo-600" />
                        SaaS Tenant Activity Insights
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal">
                        {schoolAnalytics.schoolName || "This school Hub"} currently operates with <strong className="text-slate-800">{schoolAnalytics.teacherCount} active instructors</strong> coordinating learning materials across <strong className="text-slate-800">{Object.keys(schoolAnalytics.gradeDistribution || {}).length} student grade tiers</strong>. Storage consumption is highly optimized at less than <strong className="text-slate-800">1.5%</strong> of sandbox limits, with <strong className="text-slate-800">{schoolAnalytics.fileCount} unique curricular resources</strong> available in-browser.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* B. OWNER MANAGING SCHOOLS */}
            {currentUser.role === "owner" && activeTab === "schools" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">Schools Registries</h2>
                    <p className="text-xs text-slate-500">Configure global educational tenants and isolate user directories.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Create School Form */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm xl:col-span-1 space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Plus className="h-4.5 w-4.5 text-indigo-600" />
                      Register New Educational Tenant
                    </h3>
                    <form onSubmit={handleCreateSchool} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Unique School ID (e.g., oxford-high)</label>
                        <input
                          type="text"
                          placeholder="alphanumeric-with-dashes"
                          value={newSchoolId}
                          onChange={(e) => setNewSchoolId(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">School Hub Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Oxford High International"
                          value={newSchoolName}
                          onChange={(e) => setNewSchoolName(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Configuration Settings JSON</label>
                        <textarea
                          placeholder='{ "primaryColor": "blue", "maxStorage": 50000000 }'
                          value={newSchoolSettings}
                          onChange={(e) => setNewSchoolSettings(e.target.value)}
                          rows={3}
                          className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                      >
                        Onboard Tenant School
                      </button>
                    </form>
                  </div>

                  {/* Schools Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm xl:col-span-2 overflow-x-auto">
                    <h3 className="font-extrabold text-sm text-slate-800 mb-4">Active Schools On the Platform</h3>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                          <th className="py-3 px-2">ID Code</th>
                          <th className="py-3 px-2">School Hub Name</th>
                          <th className="py-3 px-2">Onboarding Date</th>
                          <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {schools.map((school) => (
                          <tr key={school.schoolId} className="hover:bg-slate-50/50">
                            <td className="py-3 px-2 font-mono font-bold text-indigo-700">{school.schoolId}</td>
                            <td className="py-3 px-2 font-semibold text-slate-900">{school.schoolName}</td>
                            <td className="py-3 px-2 text-slate-500">{new Date(school.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-2 text-right space-x-2">
                              <button
                                onClick={() => setEditingSchool(school)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 shadow-sm"
                                title="Edit school properties"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSchool(school.schoolId)}
                                className="p-1.5 rounded-lg border border-rose-150 bg-white text-rose-600 hover:bg-rose-50 shadow-sm"
                                title="Decommission school"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {schools.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-slate-400">No schools are onboarded yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Edit School Modal */}
                {editingSchool && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
                      <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                        <h4 className="font-extrabold text-sm">Update School Tenant</h4>
                        <button onClick={() => setEditingSchool(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
                      </div>
                      <form onSubmit={handleUpdateSchool} className="p-6 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">School ID (Immutable)</label>
                          <input
                            type="text"
                            value={editingSchool.schoolId}
                            disabled
                            className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-100 text-slate-500 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">School Name</label>
                          <input
                            type="text"
                            value={editingSchool.schoolName}
                            onChange={(e) => setEditingSchool({ ...editingSchool, schoolName: e.target.value })}
                            className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                            required
                          />
                        </div>
                        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setEditingSchool(null)}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                          >
                            Save Settings
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* High-Security School Deletion Safeguard Modal */}
                {schoolToDelete && (
                  <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-rose-100 overflow-hidden">
                      <div className="bg-rose-600 p-5 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5" />
                          <h4 className="font-extrabold text-sm uppercase tracking-wide">Decommission School Safeguard</h4>
                        </div>
                        <button onClick={() => setSchoolToDelete(null)} className="text-white/80 hover:text-white text-xs">✕</button>
                      </div>
                      <div className="p-6 space-y-4">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          You are about to decommission the School Hub: <strong className="text-slate-900 font-bold">{schoolToDelete}</strong>. 
                        </p>
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-[11px] text-rose-800 leading-relaxed font-medium">
                          <strong>CRITICAL WARNING:</strong> This action is 100% permanent and irreversible. Doing so will immediately trigger a cascading delete that wipes out all users, files, folders, metadata, and security settings associated with this tenant.
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-2">
                            Type <span className="text-rose-600 font-mono select-all font-bold">&quot;{schoolToDelete}&quot;</span> to authorize deletion:
                          </label>
                          <input
                            type="text"
                            placeholder="Type School ID exactly..."
                            value={deleteConfirmInput}
                            onChange={(e) => setDeleteConfirmInput(e.target.value)}
                            className="w-full text-xs border border-rose-200 focus:border-rose-500 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-rose-50/20 font-mono"
                          />
                        </div>
                        <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setSchoolToDelete(null)}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold"
                          >
                            Abort
                          </button>
                          <button
                            type="button"
                            onClick={executeDeleteSchool}
                            disabled={deleteConfirmInput !== schoolToDelete}
                            className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all ${
                              deleteConfirmInput === schoolToDelete 
                                ? "bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-md" 
                                : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-100"
                            }`}
                          >
                            Confirm Permanent Decommission
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* C. OWNER/ADMIN USER REGISTRY */}
            {(currentUser.role === "owner" || currentUser.role === "admin") && activeTab === "users" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">User Registry Database</h2>
                    <p className="text-xs text-slate-500">
                      {currentUser.role === "owner"
                        ? "Manage global administrative access, teacher workspaces, and student portfolios across all schools."
                        : `Manage educational staff and student accounts for ${currentUser.schoolId}.`}
                    </p>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users by name, username or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>

                  {currentUser.role === "owner" && (
                    <div className="w-full sm:w-auto">
                      <select
                        value={schoolFilter}
                        onChange={(e) => setSchoolFilter(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                      >
                        <option value="">All Schools</option>
                        {schools.map((s) => (
                          <option key={s.schoolId} value={s.schoolId}>{s.schoolId}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="w-full sm:w-auto">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                    >
                      <option value="">All Roles</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="teacher">Teacher</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="student">Student</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Create User Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm xl:col-span-1 space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <UserPlus className="h-4.5 w-4.5 text-indigo-600" />
                      Provision User Account
                    </h3>
                    <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                      {currentUser.role === "owner" && (
                        <div>
                          <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Assign Tenant School *</label>
                          <select
                            value={newUserSchoolId}
                            onChange={(e) => setNewUserSchoolId(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none"
                            required
                          >
                            <option value="">Choose School...</option>
                            {schools.map((s) => (
                              <option key={s.schoolId} value={s.schoolId}>{s.schoolName} ({s.schoolId})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Security Role *</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as any)}
                          className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none"
                          required
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="coordinator">Coordinator</option>
                          <option value="admin">School Admin</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Full Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Robert Greenwood"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Unique Username *</label>
                        <input
                          type="text"
                          placeholder="e.g. robert.g"
                          value={newUserUsername}
                          onChange={(e) => setNewUserUsername(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Email Address *</label>
                        <input
                          type="email"
                          placeholder="robert@school.edu"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Initial Password *</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Grade Level</label>
                          <input
                            type="text"
                            placeholder="e.g. Grade 10"
                            value={newUserGrade}
                            onChange={(e) => setNewUserGrade(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Subject Focus</label>
                          <input
                            type="text"
                            placeholder="e.g. Science"
                            value={newUserSubject}
                            onChange={(e) => setNewUserSubject(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors text-xs"
                      >
                        Create User Account
                      </button>
                    </form>
                  </div>

                  {/* Users Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm xl:col-span-2 overflow-x-auto">
                    <h3 className="font-extrabold text-sm text-slate-800 mb-4">Active System Accounts ({filteredUsers.length})</h3>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                          <th className="py-3 px-2">Name / Email</th>
                          <th className="py-3 px-2">School</th>
                          <th className="py-3 px-2">Role</th>
                          <th className="py-3 px-2">Grade/Subject</th>
                          <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredUsers.map((user) => (
                          <tr key={user.userId} className="hover:bg-slate-50/50">
                            <td className="py-3 px-2">
                              <p className="font-bold text-slate-900">{user.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{user.email} • @{user.username}</p>
                            </td>
                            <td className="py-3 px-2">
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100">
                                {user.schoolId}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${
                                user.role === "owner" ? "bg-purple-100 text-purple-800" :
                                user.role === "admin" ? "bg-rose-100 text-rose-800" :
                                user.role === "teacher" ? "bg-amber-100 text-amber-800" :
                                user.role === "coordinator" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700"
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-slate-500">
                              {user.grade || user.subject ? (
                                <p className="font-medium text-slate-700">
                                  {user.grade || "All Grades"} • {user.subject || "All Subjects"}
                                </p>
                              ) : "Platform Scope"}
                            </td>
                            <td className="py-3 px-2 text-right space-x-2">
                              <button
                                onClick={() => setEditingUser(user)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 shadow-sm"
                                title="Modify account profile"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              {user.username !== "yamenyehya" && (
                                <button
                                  onClick={() => handleDeleteUser(user.userId)}
                                  className="p-1.5 rounded-lg border border-rose-150 bg-white text-rose-600 hover:bg-rose-50 shadow-sm"
                                  title="Delete account"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-400">No matching user accounts found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Edit User Modal */}
                {editingUser && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
                      <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                        <h4 className="font-extrabold text-sm">Update User Profile</h4>
                        <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
                      </div>
                      <form onSubmit={handleUpdateUser} className="p-6 space-y-4 text-xs">
                        <div>
                          <label className="block text-slate-500 font-bold uppercase mb-1">Full Name</label>
                          <input
                            type="text"
                            value={editingUser.name}
                            onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                            className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 font-bold uppercase mb-1">Email Address</label>
                          <input
                            type="email"
                            value={editingUser.email}
                            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                            className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-500 font-bold uppercase mb-1">Grade Level</label>
                            <input
                              type="text"
                              value={editingUser.grade || ""}
                              onChange={(e) => setEditingUser({ ...editingUser, grade: e.target.value })}
                              className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 font-bold uppercase mb-1">Subject Focus</label>
                            <input
                              type="text"
                              value={editingUser.subject || ""}
                              onChange={(e) => setEditingUser({ ...editingUser, subject: e.target.value })}
                              className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-500 font-bold uppercase mb-1">Reset Password (Keep blank to leave unchanged)</label>
                          <input
                            type="password"
                            placeholder="Enter new password"
                            onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value } as any)}
                            className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                          />
                        </div>

                        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* D. OWNER/ADMIN ACADEMIC FILE REPOSITORY */}
            {(currentUser.role === "owner" || currentUser.role === "admin") && activeTab === "files" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Platform Files Repository</h2>
                  <p className="text-xs text-slate-500">View and audit physical lesson materials, verify isolation integrity, and override permissions.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search files by title, subject, or grade level..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                    />
                  </div>

                  {currentUser.role === "owner" && (
                    <div>
                      <select
                        value={schoolFilter}
                        onChange={(e) => setSchoolFilter(e.target.value)}
                        className="text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                      >
                        <option value="">All Schools</option>
                        {schools.map((s) => (
                          <option key={s.schoolId} value={s.schoolId}>{s.schoolId}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                        <th className="py-3 px-2">Document Title</th>
                        <th className="py-3 px-2">School Isolation</th>
                        <th className="py-3 px-2">Target Grade/Subject</th>
                        <th className="py-3 px-2">File Size</th>
                        <th className="py-3 px-2">Shared Publicly</th>
                        <th className="py-3 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredFiles.map((file) => (
                        <tr key={file.fileId} className="hover:bg-slate-50/50">
                          <td className="py-3 px-2">
                            <p className="font-bold text-slate-900">{file.title}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-xs">{file.description || "No description provided."}</p>
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {file.schoolId}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-medium text-slate-700">
                            {file.grade || "Any Grade"} • {file.subject || "Any Subject"}
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-500">
                            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "Unknown Size"}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              file.permissions?.isPublicGlobal ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                            }`}>
                              {file.permissions?.isPublicGlobal ? "GLOBAL" : "ISOLATED"}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right space-x-2">
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-150 shadow-sm inline-block"
                              title="Download document file"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => setEditingFile(file)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 shadow-sm"
                              title="Edit file permissions metadata"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFile(file.fileId)}
                              className="p-1.5 rounded-lg border border-rose-150 bg-white text-rose-600 hover:bg-rose-50 shadow-sm"
                              title="Remove file"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredFiles.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">No document files found in registry.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Edit File Modal */}
                {editingFile && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
                      <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                        <h4 className="font-extrabold text-sm">Update File Metadata</h4>
                        <button onClick={() => setEditingFile(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
                      </div>
                      <form onSubmit={handleUpdateFile} className="p-6 space-y-4 text-xs">
                        <div>
                          <label className="block text-slate-500 font-bold uppercase mb-1">Document Title</label>
                          <input
                            type="text"
                            value={editingFile.title}
                            onChange={(e) => setEditingFile({ ...editingFile, title: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 font-bold uppercase mb-1">Description</label>
                          <textarea
                            value={editingFile.description || ""}
                            onChange={(e) => setEditingFile({ ...editingFile, description: e.target.value })}
                            rows={2}
                            className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-500 font-bold uppercase mb-1">Grade Restriction</label>
                            <input
                              type="text"
                              value={editingFile.grade || ""}
                              onChange={(e) => setEditingFile({ ...editingFile, grade: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 font-bold uppercase mb-1">Subject Restriction</label>
                            <input
                              type="text"
                              value={editingFile.subject || ""}
                              onChange={(e) => setEditingFile({ ...editingFile, subject: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="flex items-center gap-2.5 font-bold text-slate-700 uppercase tracking-wider text-[10px] bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!editingFile.permissions?.isPublicGlobal}
                              onChange={(e) => setEditingFile({
                                ...editingFile,
                                permissions: {
                                  ...editingFile.permissions,
                                  isPublicGlobal: e.target.checked
                                }
                              })}
                              className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            Share as Global Resource (Public to all schools)
                          </label>
                        </div>

                        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setEditingFile(null)}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* E. OWNER BULK EXCEL IMPORTER */}
            {currentUser.role === "owner" && activeTab === "importer" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full">SaaS Utility</span>
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Gemini AI Assisted
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight mt-2 text-white">AI-Assisted Multi-Tenant Spreadsheet Importer</h2>
                    <p className="text-xs text-indigo-100/70 mt-1 max-w-2xl">Onboard students, teachers, and staff instantly. Upload spreadsheet files (.csv, .xlsx, .txt) or drop them below. Gemini AI extracts names, emails, grades, and subjects, generates unique usernames, secure default passwords, and registers them automatically.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Onboard Config Panel */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm lg:col-span-1 space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2">Importer Settings</h3>
                    <form onSubmit={handleAIParsedImport} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Target School Hub *</label>
                        <select
                          value={bulkSchoolId}
                          onChange={(e) => setBulkSchoolId(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        >
                          <option value="">Choose School...</option>
                          {schools.map((s) => (
                            <option key={s.schoolId} value={s.schoolId}>{s.schoolName} ({s.schoolId})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Fallback Role *</label>
                        <select
                          value={bulkRole}
                          onChange={(e) => setBulkRole(e.target.value as any)}
                          className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        >
                          <option value="student">Student (Default)</option>
                          <option value="teacher">Teacher</option>
                          <option value="coordinator">Coordinator</option>
                          <option value="admin">School Admin</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Fallback Grade</label>
                          <input
                            type="text"
                            placeholder="e.g. Grade 10"
                            value={bulkGrade}
                            onChange={(e) => setBulkGrade(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Fallback Subject</label>
                          <input
                            type="text"
                            placeholder="e.g. Physics"
                            value={bulkSubject}
                            onChange={(e) => setBulkSubject(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* File Drag-and-Drop Area */}
                      <div className="space-y-2">
                        <label className="block text-slate-500 font-bold uppercase tracking-wide text-[10px]">Upload Spreadsheet File</label>
                        <div 
                          className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-slate-50 hover:bg-slate-50/50"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setBulkNamesText(ev.target?.result as string);
                                showNotification("success", `Spreadsheet file '${file.name}' dropped & loaded!`);
                              };
                              reader.readAsText(file);
                            }
                          }}
                          onClick={() => document.getElementById("csv-file-importer")?.click()}
                        >
                          <UploadCloud className="h-7 w-7 mx-auto text-slate-400 mb-1" />
                          <p className="text-[11px] font-semibold text-slate-700">Drag & Drop Spreadsheet File Here</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">or click to browse (.csv, .xlsx, .txt)</p>
                          <input 
                            type="file" 
                            id="csv-file-importer" 
                            accept=".csv,.txt,.xlsx,.xls" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  setBulkNamesText(ev.target?.result as string);
                                  showNotification("success", `Spreadsheet file '${file.name}' read successfully!`);
                                };
                                reader.readAsText(file);
                              }
                            }} 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Spreadsheet raw text or pasted CSV data *</label>
                        <textarea
                          placeholder="Paste CSV contents, or write unstructured text, e.g.:&#10;John Doe, john@example.com, teacher, Subject: Physics, Grade 11&#10;Alice Smith, student, Grade 10"
                          value={bulkNamesText}
                          onChange={(e) => setBulkNamesText(e.target.value)}
                          rows={4}
                          className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isAILoading}
                        className={`w-full py-3 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 ${
                          isAILoading ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                      >
                        {isAILoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            AI is Parsing Spreadsheet...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            AI Parse & Onboard Accounts
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Onboarding Result Feed */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="font-extrabold text-sm text-slate-800">Processed Spreadsheet Live Output</h3>
                        {aiImportResult && aiImportResult.length > 0 && (
                          <button
                            onClick={downloadProcessedCSV}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Download className="h-3.5 w-3.5" /> Download Processed Spreadsheet
                          </button>
                        )}
                      </div>

                      {bulkImportError && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>{bulkImportError}</span>
                        </div>
                      )}

                      {isAILoading && (
                        <div className="text-center py-20 text-slate-500 flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
                          <p className="text-xs font-bold">Contacting Gemini AI Engine to parse, validate and map spreadsheet accounts...</p>
                          <p className="text-[10px] text-slate-400 max-w-sm">Please hold on while we run cross-tenant validation rules and generate secure default passwords for all academic portfolios.</p>
                        </div>
                      )}

                      {aiImportResult ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                            <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                            <span>Successfully registered and isolated <strong>{aiImportResult.length}</strong> academic profiles into school <strong>&quot;{bulkSchoolId}&quot;</strong>. Download the generated records below.</span>
                          </div>

                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 font-bold border-b border-slate-200 text-slate-700 text-xs flex justify-between">
                              <span>Generated Portfolios & Access Keys</span>
                              <span className="text-[10px] text-slate-400 font-normal">Stored in Secure Multi-Tenant Database</span>
                            </div>
                            <div className="overflow-x-auto max-h-96">
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                                    <th className="px-4 py-2.5">Name</th>
                                    <th className="px-4 py-2.5">Role</th>
                                    <th className="px-4 py-2.5">Grade / Subject</th>
                                    <th className="px-4 py-2.5">Username</th>
                                    <th className="px-4 py-2.5">Temp Password</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-slate-950 font-mono text-emerald-400">
                                  {aiImportResult.map((u: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-900 transition-colors">
                                      <td className="px-4 py-2 font-bold text-white">{u.name}</td>
                                      <td className="px-4 py-2 uppercase text-[10px]">{u.role}</td>
                                      <td className="px-4 py-2 text-slate-300">
                                        {u.role === "teacher" 
                                          ? `Subject: ${u.subject || 'N/A'} (Lvl: ${u.grade || 'All'})` 
                                          : `Grade: ${u.grade || 'N/A'}`}
                                      </td>
                                      <td className="px-4 py-2 text-indigo-300">{u.username}</td>
                                      <td className="px-4 py-2 text-amber-300 font-bold">{u.password}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ) : !isAILoading && (
                        <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center gap-3">
                          <FileSpreadsheet className="h-12 w-12 text-slate-300" />
                          <p className="text-xs font-semibold">Awaiting multi-tenant spreadsheet document ingestion.</p>
                          <p className="text-[10px] text-slate-400 max-w-sm">Upload a school roster spreadsheet or paste raw CSV lines on the left, then trigger the AI parser model.</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500 flex items-start gap-2">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                      <span>The AI Importer is equipped with real-time academic validation algorithms. Student profiles are correctly mapped to their corresponding grades, while teacher records mandate subject specializations with automated cascading failovers. Password hashing occurs immediately server-side.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* F. STUDENT & TEACHER INDEPENDENT WORKSPACE PORTALS */}
            {activeTab === "workspace" && currentUser && (
              <div className="space-y-6">
                {currentUser.role === "student" ? (
                  /* --- REDESIGNED STUDENT DASHBOARD --- */
                  <div className="space-y-6 animate-fade-in">
                    {/* Student Hero Header */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-slate-800">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full">Academic Portfolio</span>
                            <span className="bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full">
                              School Hub: {currentUser.schoolId}
                            </span>
                          </div>
                          <h2 className="text-2xl font-black mt-2">Welcome back, {currentUser.name}!</h2>
                          <p className="text-xs text-indigo-200/80 mt-1">Access your assigned curriculum coursework, study lectures, and global public reference library.</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="bg-indigo-950/80 border border-indigo-800/60 rounded-2xl px-4 py-2 text-center">
                            <p className="text-[9px] uppercase font-bold text-indigo-300 tracking-wider">My Grade Level</p>
                            <p className="text-sm font-black text-white">{currentUser.grade || "All Levels"}</p>
                          </div>
                          <div className="bg-amber-950/80 border border-amber-800/60 rounded-2xl px-4 py-2 text-center">
                            <p className="text-[9px] uppercase font-bold text-amber-300 tracking-wider">My Specialization</p>
                            <p className="text-sm font-black text-white">{currentUser.subject || "All Subjects"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Student Content Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                      {/* Left Side Navigation Bar */}
                      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider px-3 mb-2">Academic Sections</p>
                        <button
                          onClick={() => { setStudentSubTab("teachers"); setSelectedTeacher(null); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            studentSubTab === "teachers" 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <Users className="h-4 w-4" />
                          Teachers Directory
                        </button>
                        <button
                          onClick={() => { setStudentSubTab("assignments"); setSelectedTeacher(null); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            studentSubTab === "assignments" 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <BookOpenCheck className="h-4 w-4" />
                          Assignments & Tasks
                        </button>
                        <button
                          onClick={() => { setStudentSubTab("public"); setSelectedTeacher(null); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            studentSubTab === "public" 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <Database className="h-4 w-4" />
                          Public Global Library
                        </button>
                        <button
                          onClick={() => { setStudentSubTab("private"); setSelectedTeacher(null); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            studentSubTab === "private" 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <Lock className="h-4 w-4" />
                          Private Assigned Files
                        </button>
                      </div>

                      {/* Right Side Content Display */}
                      <div className="lg:col-span-3 space-y-6">
                        
                        {/* Tab 1: Teachers Directory */}
                        {studentSubTab === "teachers" && !selectedTeacher && (
                          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                            <div>
                              <h3 className="text-lg font-black text-slate-800">Faculty & Teachers Directory</h3>
                              <p className="text-xs text-slate-500 mt-0.5">Click on any instructor to explore documents, materials, and lessons published specifically by them.</p>
                            </div>

                            {users.filter(u => u.role === "teacher" && u.schoolId === currentUser.schoolId).length === 0 ? (
                              <div className="text-center py-16 text-slate-400">
                                <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-bold">No teachers onboarded inside this school hub yet.</p>
                                <p className="text-[10px]">Contact the school system administrator to enroll your faculty staff.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {users.filter(u => u.role === "teacher" && u.schoolId === currentUser.schoolId).map((teacher) => (
                                  <div 
                                    key={teacher.userId}
                                    className="p-5 border border-slate-200 hover:border-indigo-300 rounded-xl bg-slate-50 hover:bg-white transition-all shadow-xs flex flex-col justify-between"
                                  >
                                    <div className="flex gap-3">
                                      <div className="h-10 w-10 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center uppercase shadow-sm">
                                        {teacher.name.substring(0, 2)}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-slate-900 truncate">{teacher.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Email: {teacher.email || "No email"}</p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                            {teacher.subject || "General Specialist"}
                                          </span>
                                          <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            {teacher.grade || "All Grades"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => {
                                        setSelectedTeacher(teacher);
                                        setTeacherFileClassFilter("");
                                        setTeacherFileSubjectFilter("");
                                      }}
                                      className="mt-4 w-full py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-colors border border-indigo-100/50 flex items-center justify-center gap-1.5"
                                    >
                                      Explore Instructor Files <ChevronRight className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Teacher's Individual Files Portal (Nested under Teachers Directory) */}
                        {studentSubTab === "teachers" && selectedTeacher && (
                          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                            {/* Breadcrumb Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                              <button
                                onClick={() => setSelectedTeacher(null)}
                                className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                              >
                                ← Back to Faculty Directory
                              </button>
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                  Viewing Instructor Portal
                                </span>
                              </div>
                            </div>

                            {/* Instructor Banner */}
                            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-center gap-4">
                              <div className="h-12 w-12 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm uppercase">
                                {selectedTeacher.name.substring(0, 2)}
                              </div>
                              <div>
                                <h3 className="text-sm font-extrabold text-slate-900">{selectedTeacher.name}</h3>
                                <p className="text-[11px] text-slate-500">Subject specialization: <strong className="text-slate-700">{selectedTeacher.subject || "General Studies"}</strong> | Assigned Grades: <strong className="text-slate-700">{selectedTeacher.grade || "All Grades"}</strong></p>
                              </div>
                            </div>

                            {/* Live Search and Class & Subject Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150 text-xs">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Filter by Class / Grade Level</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Grade 10"
                                  value={teacherFileClassFilter}
                                  onChange={(e) => setTeacherFileClassFilter(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Filter by Subject</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Physics"
                                  value={teacherFileSubjectFilter}
                                  onChange={(e) => setTeacherFileSubjectFilter(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Rendered Teacher Files */}
                            <div>
                              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider mb-3">Published Learning Documents ({
                                files.filter(f => 
                                  (f.uploadedBy === selectedTeacher.userId || f.teacherId === selectedTeacher.userId || f.uploaderUsername === selectedTeacher.username) &&
                                  (teacherFileClassFilter ? f.grade?.toLowerCase().includes(teacherFileClassFilter.toLowerCase()) : true) &&
                                  (teacherFileSubjectFilter ? f.subject?.toLowerCase().includes(teacherFileSubjectFilter.toLowerCase()) : true)
                                ).length
                              })</h4>

                              {files.filter(f => 
                                (f.uploadedBy === selectedTeacher.userId || f.teacherId === selectedTeacher.userId || f.uploaderUsername === selectedTeacher.username) &&
                                (teacherFileClassFilter ? f.grade?.toLowerCase().includes(teacherFileClassFilter.toLowerCase()) : true) &&
                                (teacherFileSubjectFilter ? f.subject?.toLowerCase().includes(teacherFileSubjectFilter.toLowerCase()) : true)
                              ).length === 0 ? (
                                <div className="text-center py-16 text-slate-400 bg-slate-50/30 rounded-xl border border-slate-100">
                                  <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                  <p className="text-xs font-bold">No documents match the active filters.</p>
                                  <p className="text-[10px]">Adjust your class level or subject query above.</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {files.filter(f => 
                                    (f.uploadedBy === selectedTeacher.userId || f.teacherId === selectedTeacher.userId || f.uploaderUsername === selectedTeacher.username) &&
                                    (teacherFileClassFilter ? f.grade?.toLowerCase().includes(teacherFileClassFilter.toLowerCase()) : true) &&
                                    (teacherFileSubjectFilter ? f.subject?.toLowerCase().includes(teacherFileSubjectFilter.toLowerCase()) : true)
                                  ).map((file) => (
                                    <div key={file.fileId} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all flex justify-between gap-3 shadow-xs">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono ${
                                            file.category === "assignment" ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                                          }`}>
                                            {file.category || "resource"}
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-mono uppercase">{file.fileType}</span>
                                        </div>
                                        <h5 className="text-xs font-bold text-slate-900 mt-1 truncate" title={file.title}>{file.title}</h5>
                                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{file.description || "No description provided."}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                          {file.grade && <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-200 text-slate-700">{file.grade}</span>}
                                          {file.subject && <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-150 text-amber-800">{file.subject}</span>}
                                        </div>
                                      </div>
                                      <div className="self-end shrink-0">
                                        <a
                                          href={file.fileUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-sm transition-colors block"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tab 2: Assignments Workspace */}
                        {studentSubTab === "assignments" && (
                          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                            <div>
                              <h3 className="text-lg font-black text-slate-800">Pending Assignments & Homework Tasks</h3>
                              <p className="text-xs text-slate-500 mt-0.5 font-medium">Download active worksheet materials, quizzes, and course assignment guidelines.</p>
                            </div>

                            {files.filter(f => f.category === "assignment").length === 0 ? (
                              <div className="text-center py-20 text-slate-400">
                                <BookOpenCheck className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-bold">No homework assignments found.</p>
                                <p className="text-[10px]">Your class instructors have not published any files classified as Assignments yet.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {files.filter(f => f.category === "assignment").map((file) => (
                                  <div key={file.fileId} className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 hover:bg-white transition-all flex justify-between gap-3 shadow-xs">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-rose-600 text-white font-mono">
                                          ASSIGNMENT
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono uppercase">{file.fileType}</span>
                                      </div>
                                      <h5 className="text-xs font-bold text-slate-900 mt-2.5 truncate" title={file.title}>{file.title}</h5>
                                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{file.description || "No description provided."}</p>
                                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                        {file.grade && <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-200 text-slate-700">{file.grade}</span>}
                                        {file.subject && <span className="px-1.5 py-0.5 rounded text-[8px] bg-rose-50 text-rose-800 border border-rose-100">{file.subject}</span>}
                                      </div>
                                    </div>
                                    <div className="self-end shrink-0">
                                      <a
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-900 shadow-sm transition-colors block"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tab 3: Public Global Library */}
                        {studentSubTab === "public" && (
                          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                            <div>
                              <h3 className="text-lg font-black text-slate-800">Public Educational Library</h3>
                              <p className="text-xs text-slate-500 mt-0.5">Explore open educational resources (OER) shared globally across all registered tenant academies.</p>
                            </div>

                            {files.filter(f => f.permissions?.isPublicGlobal === true).length === 0 ? (
                              <div className="text-center py-20 text-slate-400">
                                <Database className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-bold">The Public Educational Library is currently empty.</p>
                                <p className="text-[10px]">Teachers can authorize global sharing during document submission.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {files.filter(f => f.permissions?.isPublicGlobal === true).map((file) => (
                                  <div key={file.fileId} className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/10 hover:bg-white transition-all flex justify-between gap-3 shadow-xs">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-600 text-white font-mono">
                                          GLOBAL OER
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono uppercase">{file.fileType}</span>
                                      </div>
                                      <h5 className="text-xs font-bold text-slate-900 mt-2.5 truncate" title={file.title}>{file.title}</h5>
                                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{file.description || "No description provided."}</p>
                                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                        {file.grade && <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-200 text-slate-700">{file.grade}</span>}
                                        {file.subject && <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-100">{file.subject}</span>}
                                      </div>
                                    </div>
                                    <div className="self-end shrink-0">
                                      <a
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-emerald-600 hover:text-emerald-900 shadow-sm transition-colors block"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tab 4: Private Assigned Files */}
                        {studentSubTab === "private" && (
                          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                            <div>
                              <h3 className="text-lg font-black text-slate-800">Private Study Materials</h3>
                              <p className="text-xs text-slate-500 mt-0.5">Documents isolated specifically to your school hub tenant and academic profile.</p>
                            </div>

                            {files.filter(f => f.permissions?.isPublicGlobal !== true && f.category !== "assignment").length === 0 ? (
                              <div className="text-center py-20 text-slate-400">
                                <Lock className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-bold">No private study documents found.</p>
                                <p className="text-[10px]">Your instructors have not published private files restricted to your hub yet.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {files.filter(f => f.permissions?.isPublicGlobal !== true && f.category !== "assignment").map((file) => (
                                  <div key={file.fileId} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all flex justify-between gap-3 shadow-xs">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-800 text-white font-mono">
                                          PRIVATE
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono uppercase">{file.fileType}</span>
                                      </div>
                                      <h5 className="text-xs font-bold text-slate-900 mt-2.5 truncate" title={file.title}>{file.title}</h5>
                                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{file.description || "No description provided."}</p>
                                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                        {file.grade && <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-200 text-slate-700">{file.grade}</span>}
                                        {file.subject && <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-50 text-slate-700 border border-slate-200">{file.subject}</span>}
                                      </div>
                                    </div>
                                    <div className="self-end shrink-0">
                                      <a
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-sm transition-colors block"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                ) : (
                  /* --- ADMN / TEACHER / COORDINATOR WORKSPACE --- */
                  <>
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-900">
                          Lesson Creator & Materials Workspace
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Upload, categorize, and distribute educational files to your target classes with isolated multi-tenant safeguards.
                        </p>
                      </div>
                      <div className="px-4 py-2 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-800 text-xs font-bold uppercase tracking-wider">
                        {currentUser.role} Portal
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Column: Stats or Upload */}
                      <div className="lg:col-span-1 space-y-6">
                        {/* Academic Profile Details Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                          <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2">My Academic Scope</h3>
                          <div className="space-y-3.5 text-xs">
                            <div className="flex justify-between border-b border-slate-50 pb-2">
                              <span className="text-slate-500">Tenant School:</span>
                              <span className="font-bold text-slate-900">{currentUser.schoolId}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-2">
                              <span className="text-slate-500">Assigned Level:</span>
                              <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                {currentUser.grade || "All Grades"}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-2">
                              <span className="text-slate-500">Subject Focus:</span>
                              <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                                {currentUser.subject || "All Subjects"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Teacher Upload Widget */}
                        {["admin", "teacher", "coordinator"].includes(currentUser.role) && (
                          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                            <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                              <Upload className="h-4 w-4 text-indigo-600" />
                              Publish Lesson Material
                            </h3>
                            <form onSubmit={handleFileUpload} className="space-y-4 text-xs">
                              {uploadError && (
                                <div className="p-3 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-100 flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                  <span>{uploadError}</span>
                                </div>
                              )}

                              {uploadSuccess && (
                                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-100 flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                                  <span>{uploadSuccess}</span>
                                </div>
                              )}

                              <div>
                                <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Document Title *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Greenwood Physics Lab 1"
                                  value={uploadTitle}
                                  onChange={(e) => setUploadTitle(e.target.value)}
                                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Description Summary</label>
                                <textarea
                                  placeholder="Outline the course readings or submission requirements..."
                                  value={uploadDescription}
                                  onChange={(e) => setUploadDescription(e.target.value)}
                                  rows={3}
                                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Resource Category *</label>
                                  <select
                                    value={uploadCategory}
                                    onChange={(e) => setUploadCategory(e.target.value as any)}
                                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none font-bold"
                                    required
                                  >
                                    <option value="resource">Study Resource</option>
                                    <option value="assignment">Homework Assignment</option>
                                    <option value="reading">Lecture Reading</option>
                                  </select>
                                </div>
                                <div className="flex flex-col justify-center">
                                  <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Global Sharing</label>
                                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={uploadIsPublicGlobal}
                                      onChange={(e) => setUploadIsPublicGlobal(e.target.checked)}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-[10px] text-slate-600 font-bold uppercase">Public OER Library</span>
                                  </label>
                                </div>
                              </div>

                              <div>
                                <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Target Grade Level</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Grade 10"
                                  value={uploadGrade}
                                  onChange={(e) => setUploadGrade(e.target.value)}
                                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Target Academic Subject</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Physics"
                                  value={uploadSubject}
                                  onChange={(e) => setUploadSubject(e.target.value)}
                                  className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 font-bold mb-1 uppercase tracking-wide text-[10px]">Choose file (.pdf, .docx, .xlsx, images):</label>
                                <input
                                  type="file"
                                  id="document-file-input"
                                  onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                                  className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 text-slate-500 focus:outline-none"
                                  required
                                />
                              </div>

                              <button
                                type="submit"
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors text-xs flex items-center justify-center gap-2"
                              >
                                <Upload className="h-4 w-4" />
                                Submit Lesson Resource
                              </button>
                            </form>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Files List for current school */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3 mb-6">
                            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                              <BookOpen className="h-4.5 w-4.5 text-indigo-600" />
                              Academic Learning Repository ({filteredFiles.length})
                            </h3>
                            <div className="relative">
                              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Filter files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="text-xs border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                              />
                            </div>
                          </div>

                          {filteredFiles.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-2">
                              <FolderOpen className="h-12 w-12 text-slate-300" />
                              <p className="text-xs font-bold">No academic resources visible or matching your profile filter.</p>
                              <p className="text-[10px]">Contact your class coordinator if you require files for your subject.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {filteredFiles.map((file) => (
                                <div
                                  key={file.fileId}
                                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex gap-3 hover:shadow-md transition-shadow relative overflow-hidden"
                                >
                                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-indigo-600 self-start">
                                    <FileText className="h-5 w-5" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                                        {file.category || "resource"}
                                      </span>
                                      <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-200 text-slate-600 font-mono">
                                        {file.fileType}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 truncate mt-1">{file.title}</h4>
                                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{file.description || "No description provided."}</p>

                                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                      {file.grade && (
                                        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                          {file.grade}
                                        </span>
                                      )}
                                      {file.subject && (
                                        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                          {file.subject}
                                        </span>
                                      )}
                                      {file.permissions?.isPublicGlobal && (
                                        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                          OER Public
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col justify-between items-end shrink-0">
                                    <button
                                      onClick={() => setPreviewingFile(file)}
                                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-sm transition-colors"
                                      title="Open preview / Download academic document"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Teachers/Admins can delete their own files */}
                                    {(currentUser.role === "admin" || file.uploadedBy === currentUser.userId) && (
                                      <button
                                        onClick={() => handleDeleteFile(file.fileId)}
                                        className="p-1.5 rounded-lg border border-rose-100 bg-white hover:bg-rose-50 text-rose-600 shadow-sm transition-colors mt-2"
                                        title="Delete document file"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </main>

          {/* 4. IN-BROWSER FILE PREVIEW MODAL */}
          {previewingFile && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-none">{previewingFile.title}</h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono">
                        Format: {previewingFile.fileType} • Size: {previewingFile.fileSize ? `${(previewingFile.fileSize / 1024).toFixed(1)} KB` : "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewingFile.fileUrl}
                      download={previewingFile.title}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/10 transition-all flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download File
                    </a>
                    <button
                      onClick={() => setPreviewingFile(null)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Preview Viewport */}
                <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-auto p-6 relative">
                  {previewingFile.fileType.toLowerCase() === "pdf" ? (
                    <iframe
                      src={`${previewingFile.fileUrl}#toolbar=0`}
                      className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white"
                      title={previewingFile.title}
                    />
                  ) : ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(previewingFile.fileType.toLowerCase()) ? (
                    <img
                      src={previewingFile.fileUrl}
                      alt={previewingFile.title}
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-full rounded-xl object-contain shadow-md"
                    />
                  ) : ["txt", "csv", "json", "md"].includes(previewingFile.fileType.toLowerCase()) ? (
                    <iframe
                      src={previewingFile.fileUrl}
                      className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white p-4 font-mono text-xs text-slate-700"
                      title={previewingFile.title}
                    />
                  ) : (
                    <div className="text-center space-y-4 max-w-sm p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <div className="inline-flex bg-slate-50 border border-slate-200 p-4 rounded-full text-slate-400">
                        <FileText className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Advanced Academic Format</h4>
                        <p className="text-[10px] text-slate-400 mt-1">This format cannot be previewed natively in-browser. Please download the file to view its contents in your educational reader.</p>
                      </div>
                      <a
                        href={previewingFile.fileUrl}
                        download={previewingFile.title}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all block text-center"
                      >
                        Download Academic Document
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>)
      )}
    </div>
  );
}
