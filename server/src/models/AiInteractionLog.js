import { Schema, model } from 'mongoose';

const aiInteractionLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  operation: {
    type: String,
    enum: [
      'profile_summary',
      'training_recommend',
      'interview_question_gen',
      'interview_evaluate',
      'content_draft',
      'gd_review_assist',
      'resume_parse',
      'resume_polish',
      'performance_tips',
      'grooming_personalize',
    ],
    required: true,
  },
  promptVersion: String,
  status: { type: String, enum: ['success', 'error', 'rate_limited', 'fallback'], required: true },
  latencyMs: Number,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 }, // 90-day TTL
});

aiInteractionLogSchema.index({ operation: 1, status: 1 });

export const AiInteractionLog = model('AiInteractionLog', aiInteractionLogSchema);
