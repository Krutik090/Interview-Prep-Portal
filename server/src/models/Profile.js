import { Schema, model } from 'mongoose';

const profileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    fullName: { type: String, trim: true },
    avatarPath: { type: String, default: null },
    education: {
      degree: String,
      institution: String,
      graduationYear: Number,
      branch: String,
    },
    targetRole: String,
    targetDomain: String,
    experienceLevel: {
      type: String,
      enum: ['fresher', '0-1yr', '1-3yr', '3+yr'],
      default: 'fresher',
    },
    currentSkills: [{ type: String, trim: true }],
    strengths: [{ type: String, trim: true }],
    weaknesses: [{ type: String, trim: true }],
    preferredCompanies: [{ type: String, trim: true }],

    // Raw onboarding questionnaire answers — kept as the source of truth for
    // re-summarization if the AI prompt/version changes later.
    onboardingAnswersRaw: { type: Schema.Types.Mixed },

    aiSummary: {
      text: String,
      suggestedTracks: [{ type: String }],
      generatedAt: Date,
      promptVersion: String,
      model: String,
    },

    ruleBasedProfile: {
      level: String,
      recommendedTrackIds: [{ type: Schema.Types.ObjectId, ref: 'TrainingProgram' }],
    },
  },
  { timestamps: true },
);

export const Profile = model('Profile', profileSchema);
