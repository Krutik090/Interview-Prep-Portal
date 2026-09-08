import { Schema } from 'mongoose';
import { Module } from '../Module.js';

const quizSchema = new Schema({
  questions: [
    {
      questionText: { type: String, required: true },
      type: { type: String, enum: ['mcq', 'short_answer'], required: true },
      options: [{ type: String }],
      correctAnswerIndex: { type: Number },
      correctAnswerText: { type: String },
      points: { type: Number, default: 1 },
    },
  ],
  timeLimitMins: { type: Number, default: null },
  aiGenerated: { type: Boolean, default: false },
  aiDraftMeta: {
    promptVersion: String,
    generatedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
});

export const QuizModule = Module.discriminator('quiz', quizSchema);
