import { Schema, model } from 'mongoose';

const trainingProgramSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    roundType: {
      type: String,
      enum: ['Aptitude', 'GD', 'Technical', 'HR'],
      required: true,
      index: true,
    },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    passCriteria: {
      minOverallScorePct: { type: Number, default: 70, min: 0, max: 100 },
      minPerModuleScorePct: { type: Number, default: 0, min: 0, max: 100 },
    },
    // Ordered manifest of module ids — reordering is a single array update on
    // this small parent doc instead of N updates across module documents.
    moduleOrder: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
    estimatedDurationMins: Number,
    tags: [{ type: String, trim: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: Date,
  },
  { timestamps: true },
);

trainingProgramSchema.index({ roundType: 1, status: 1 });

export const TrainingProgram = model('TrainingProgram', trainingProgramSchema);
