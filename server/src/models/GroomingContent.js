import { Schema, model } from 'mongoose';

const groomingContentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['dress_code', 'body_language', 'communication', 'presentation', 'other'],
      required: true,
    },
    body: { type: String, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    aiGenerated: { type: Boolean, default: false },
    aiDraftMeta: {
      promptVersion: String,
      generatedAt: Date,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

groomingContentSchema.index({ category: 1, status: 1 });

export const GroomingContent = model('GroomingContent', groomingContentSchema);
