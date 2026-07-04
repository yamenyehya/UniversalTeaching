import { Request, Response } from "express";
import { SchoolService } from "../services/SchoolService.ts";
import { UserService } from "../services/UserService.ts";
import { FileService } from "../services/FileService.ts";
import { AuthenticatedRequest } from "../middleware/authMiddleware.ts";

export class SchoolController {
  // NOTE: School creation is an Owner-only capability and lives exclusively
  // at POST /owner/schools (see OwnerController.createSchool). There is
  // deliberately no school-creation endpoint here to avoid a second,
  // less-restricted entry point into the same operation.

  static async getSchoolById(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId } = req.params;

      // Restrict cross-tenant leaks: any member of this school, or the platform owner
      if (req.user?.role !== "owner" && req.user?.schoolId !== schoolId) {
        return res.status(403).json({ error: "Access denied. You do not belong to this school." });
      }

      const school = await SchoolService.getSchoolById(schoolId);
      if (!school) {
        return res.status(404).json({ error: `School with ID '${schoolId}' not found.` });
      }

      return res.status(200).json(school);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  static async getAllSchools(req: AuthenticatedRequest, res: Response) {
    try {
      const schools = await SchoolService.getAllSchools();
      return res.status(200).json(schools);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  static async getSchoolAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { schoolId } = req.params;

      // Restrict access to owner or school admin belonging to this school
      if (req.user?.role !== "owner" && (req.user?.schoolId !== schoolId || req.user?.role !== "admin")) {
        return res.status(403).json({ error: "Access denied. You can only view analytics for your own school." });
      }

      const school = await SchoolService.getSchoolById(schoolId);
      if (!school) {
        return res.status(404).json({ error: `School with ID '${schoolId}' not found.` });
      }

      const users = await UserService.getUsersBySchool(schoolId);
      const files = await FileService.getFilesBySchool(schoolId);

      const studentCount = users.filter((u: any) => u.role === "student").length;
      const teacherCount = users.filter((u: any) => u.role === "teacher").length;
      const activeUsersCount = users.length;

      const totalStorage = files.reduce((acc: number, f: any) => acc + (f.size || 0), 0);
      const fileCount = files.length;

      const categoryCounts = files.reduce((acc: Record<string, number>, f: any) => {
        const cat = f.category || "resource";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, { resource: 0, assignment: 0, reading: 0 });

      const gradeDistribution = users.filter((u: any) => u.role === "student").reduce((acc: Record<string, number>, u: any) => {
        const g = u.grade || "Unassigned";
        acc[g] = (acc[g] || 0) + 1;
        return acc;
      }, {});

      const subjectDistribution = users.filter((u: any) => u.role === "teacher").reduce((acc: Record<string, number>, u: any) => {
        const s = u.subject || "General";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

      return res.status(200).json({
        schoolId,
        schoolName: school.schoolName,
        studentCount,
        teacherCount,
        activeUsersCount,
        totalStorage,
        fileCount,
        categoryCounts,
        gradeDistribution,
        subjectDistribution,
      });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }
}
