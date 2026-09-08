import { Schema, model } from 'mongoose';

const moduleSchema = new Schema(
  {
    program: { type: Schema.Types.ObjectId, ref: 'TrainingProgram', required: true, index: true },
    type: {
      type: String,
      enum: ['material', 'quiz', 'ai_interview', 'gd_submission'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    instructions: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isRequired: { type: Boolean, default: true },
    maxScore: { type: Number, default: 100 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  },
  { timestamps: true, discriminatorKey: 'type' },
);

moduleSchema.index({ program: 1, order: 1 });
moduleSchema.index({ type: 1, status: 1 });

export const Module = model('Module', moduleSchema);
