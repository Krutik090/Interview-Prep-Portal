import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
    onboardingCompleted: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    lastLoginAt: Date,

    // Refresh-token rotation state (single active session per user in this
    // build). `refreshTokenHash` is the sha256 of the currently-valid
    // refresh token's jti; a mismatch on /refresh means the token being
    // presented was already rotated out (reuse) or forged, and the whole
    // session is invalidated by bumping `refreshTokenVersion`.
    refreshTokenHash: { type: String, select: false, default: null },
    refreshTokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });

export const User = model('User', userSchema);
