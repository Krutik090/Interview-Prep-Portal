import { Schema, model } from 'mongoose';

const submissionSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    module: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true, index: true },
    type: { type: String, enum: ['quiz', 'ai_interview', 'gd_submission'], required: true },
    attemptNumber: { type: Number, default: 1 },

    // quiz
    quizAnswers: [
      {
        questionIndex: Number,
        answerText: String,
        isCorrect: Boolean,
        pointsAwarded: Number,
      },
    ],

    // ai_interview
    interviewQA: [
      {
        question: String,
        answerText: { type: String, default: null },
        aiEvaluation: {
          verdict: { type: String, enum: ['pass', 'fail'] },
          feedback: String,
          score: Number,
          promptVersion: String,
          evaluatedAt: Date,
        },
      },
    ],
    interviewGenPromptVersion: String,
    // Polling flags for the async question-gen / evaluation pipeline.
    questionsReady: { type: Boolean, default: false },

    // gd_submission
    gdTextResponse: String,
    gdFilePath: { type: String, default: null },
    gdReview: {
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      verdict: { type: String, enum: ['pass', 'fail', 'pending'], default: 'pending' },
      comments: String,
      aiAssistDraft: String,
      reviewedAt: Date,
    },

    finalScorePct: { type: Number, default: null },
    status: { type: String, enum: ['submitted', 'under_review', 'graded'], default: 'submitted', index: true },
    submittedAt: { type: Date, default: Date.now },

    // Personalized improvement tips, generated asynchronously after grading.
    performanceTips: {
      text: String,
      generatedAt: Date,
      promptVersion: String,
    },
  },
  { timestamps: true },
);

submissionSchema.index({ student: 1, module: 1, attemptNumber: -1 });
submissionSchema.index({ type: 1, status: 1 });

export const Submission = model('Submission', submissionSchema);
