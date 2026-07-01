import mongoose, { Schema, Document } from "mongoose";

export interface ISchool extends Document {
  schoolId: string;
  schoolName: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema: Schema = new Schema(
  {
    schoolId: { type: String, required: true, unique: true },
    schoolName: { type: String, required: true },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.School || mongoose.model<ISchool>("School", SchoolSchema);
