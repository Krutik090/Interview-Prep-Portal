import { Schema } from 'mongoose';
import { Module } from '../Module.js';

const aiInterviewSchema = new Schema({
  // Usually mirrors the parent program's roundType, but allows e.g. a
  // Technical program to target a specific sub-skill like "DSA".
  focusArea: { type: String, default: null },
  numQuestions: { type: Number, default: 5 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  // Actual generated Q&A live per-attempt on Submission, not here — questions
  // are generated fresh per attempt, not fixed content on the module.
});

export const AiInterviewModule = Module.discriminator('ai_interview', aiInterviewSchema);
