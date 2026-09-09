import { Schema, model } from 'mongoose';

const resumeSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    sourceData: {
      profileSnapshot: Schema.Types.Mixed,
      completedPrograms: [
        {
          program: { type: Schema.Types.ObjectId, ref: 'TrainingProgram' },
          title: String,
          roundType: String,
          scorePct: Number,
        },
      ],
    },
    aiPolishedContent: {
      summary: String,
      skillsSection: [String],
      projectsSection: [String],
      achievementsSection: [String],
      promptVersion: String,
      generatedAt: Date,
    },
    pdfPath: { type: String, default: null },
    status: { type: String, enum: ['pending', 'generating', 'ready', 'failed'], default: 'pending', index: true },
    version: { type: Number, default: 1 },
    generatedAt: Date,
  },
  { timestamps: true },
);

export const Resume = model('Resume', resumeSchema);
