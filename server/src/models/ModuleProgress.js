import { Schema, model } from 'mongoose';

const moduleProgressSchema = new Schema(
  {
    enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // denormalized for direct student-scoped queries
    module: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'failed'],
      default: 'not_started',
    },
    scorePct: { type: Number, default: null },
    attempts: { type: Number, default: 0 },
    lastAttemptSubmission: { type: Schema.Types.ObjectId, ref: 'Submission', default: null },
    completedAt: Date,
  },
  { timestamps: true },
);

// One progress row per student per module within an enrollment — kept
// separate from Enrollment itself so completing a module never rewrites a
// growing embedded array on the parent doc (avoids write contention as
// students progress concurrently).
moduleProgressSchema.index({ enrollment: 1, module: 1 }, { unique: true });
moduleProgressSchema.index({ student: 1, status: 1 });

export const ModuleProgress = model('ModuleProgress', moduleProgressSchema);
