import { Schema } from 'mongoose';
import { Module } from '../Module.js';

const gdSubmissionSchema = new Schema({
  prompt: { type: String, required: true },
  submissionMode: { type: String, enum: ['text', 'file'], default: 'text' },
  maxFileSizeMB: { type: Number, default: 50 },
  allowedMimeTypes: [{ type: String }],
  reviewMode: { type: String, enum: ['manual', 'ai_assist', 'both'], default: 'manual' },
});

export const GdSubmissionModule = Module.discriminator('gd_submission', gdSubmissionSchema);
