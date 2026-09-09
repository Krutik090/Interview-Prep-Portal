import { Schema, model } from 'mongoose';

const enrollmentSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    program: { type: Schema.Types.ObjectId, ref: 'TrainingProgram', required: true, index: true },
    status: { type: String, enum: ['in_progress', 'passed', 'failed'], default: 'in_progress', index: true },
    overallScorePct: { type: Number, default: 0 },
    completedModules: { type: Number, default: 0 },
    totalModules: { type: Number, default: 0 },
    passedAt: Date,
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// A student can only enroll in a given program once; also the primary
// lookup for "is enrolled / show me my progress".
enrollmentSchema.index({ student: 1, program: 1 }, { unique: true });
enrollmentSchema.index({ program: 1, status: 1 });

export const Enrollment = model('Enrollment', enrollmentSchema);
