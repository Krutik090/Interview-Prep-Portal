import { Schema } from 'mongoose';
import { Module } from '../Module.js';

const materialSchema = new Schema({
  contentBody: { type: String, default: '' },
  videoUrl: { type: String, default: null },
  attachmentPaths: [{ type: String }],
  followUpQuizId: { type: Schema.Types.ObjectId, ref: 'Module', default: null },
});

export const MaterialModule = Module.discriminator('material', materialSchema);
