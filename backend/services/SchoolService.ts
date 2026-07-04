import SchoolModel from "../models/School.ts";

export class SchoolService {
  static async createSchool(schoolId: string, schoolName: string, settings: any = {}) {
    const existing = await (SchoolModel as any).findOne({ schoolId });
    if (existing) {
      throw new Error(`School with ID '${schoolId}' already exists.`);
    }
    return await (SchoolModel as any).create({ schoolId, schoolName, settings });
  }

  static async getSchoolById(schoolId: string) {
    return await (SchoolModel as any).findOne({ schoolId });
  }

  static async getAllSchools() {
    return await (SchoolModel as any).find({});
  }

  static async updateSchool(schoolId: string, data: Partial<any>) {
    return await (SchoolModel as any).findOneAndUpdate({ schoolId }, { $set: data }, { new: true });
  }

  static async deleteSchool(schoolId: string) {
    const result = await (SchoolModel as any).deleteOne({ schoolId });
    return result.deletedCount > 0;
  }
}
