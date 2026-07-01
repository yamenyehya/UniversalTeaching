import SchoolModel from "../models/School.ts";
import { isUsingMongo, readLocalJSON, writeLocalJSON } from "./db.ts";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const SCHOOLS_FILE = path.join(DATA_DIR, "schools.json");

export class SchoolService {
  static async createSchool(schoolId: string, schoolName: string, settings: any = {}) {
    if (isUsingMongo()) {
      // Use Mongoose
      let school = await (SchoolModel as any).findOne({ schoolId });
      if (school) {
        throw new Error(`School with ID '${schoolId}' already exists.`);
      }
      return await (SchoolModel as any).create({ schoolId, schoolName, settings });
    } else {
      // Use Fallback JSON
      const schools = readLocalJSON(SCHOOLS_FILE);
      if (schools.some((s) => s.schoolId === schoolId)) {
        throw new Error(`School with ID '${schoolId}' already exists.`);
      }
      const newSchool = {
        schoolId,
        schoolName,
        settings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      schools.push(newSchool);
      writeLocalJSON(SCHOOLS_FILE, schools);
      return newSchool;
    }
  }

  static async getSchoolById(schoolId: string) {
    if (isUsingMongo()) {
      return await (SchoolModel as any).findOne({ schoolId });
    } else {
      const schools = readLocalJSON(SCHOOLS_FILE);
      return schools.find((s) => s.schoolId === schoolId) || null;
    }
  }

  static async getAllSchools() {
    if (isUsingMongo()) {
      return await (SchoolModel as any).find({});
    } else {
      return readLocalJSON(SCHOOLS_FILE);
    }
  }

  static async updateSchool(schoolId: string, data: Partial<any>) {
    if (isUsingMongo()) {
      return await (SchoolModel as any).findOneAndUpdate({ schoolId }, { $set: data }, { new: true });
    } else {
      const schools = readLocalJSON(SCHOOLS_FILE);
      const index = schools.findIndex((s) => s.schoolId === schoolId);
      if (index === -1) return null;

      schools[index] = {
        ...schools[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      writeLocalJSON(SCHOOLS_FILE, schools);
      return schools[index];
    }
  }

  static async deleteSchool(schoolId: string) {
    if (isUsingMongo()) {
      const result = await (SchoolModel as any).deleteOne({ schoolId });
      return result.deletedCount > 0;
    } else {
      const schools = readLocalJSON(SCHOOLS_FILE);
      const initialLength = schools.length;
      const updated = schools.filter((s) => s.schoolId !== schoolId);
      writeLocalJSON(SCHOOLS_FILE, updated);
      return updated.length < initialLength;
    }
  }
}
