/* eslint-disable no-console -- CLI script; console output is the actual deliverable here */
// Development seed script — wipes and repopulates the database with a
// realistic, interconnected dataset covering every feature in the app
// (auth, onboarding, admin-managed trainings across all 4 module types,
// enrollments in every state, grooming content, AI usage history).
//
// Deliberately bypasses the service-layer AI/queue side effects (no real
// Gemini calls, no BullMQ jobs) so it runs fast and works even before
// Redis/GEMINI_API_KEY are configured — it writes the same *shape* of data
// those pipelines would have produced, using the same DB-side business
// logic (progressService.recordModuleResult) so pass/fail rollups are
// computed exactly as the real app would compute them.
//
// Usage: npm run seed   (from server/, requires MONGO_URI reachable)
import { pathToFileURL } from 'node:url';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';

import { User } from '../src/models/User.js';
import { Profile } from '../src/models/Profile.js';
import { TrainingProgram } from '../src/models/TrainingProgram.js';
import { Module } from '../src/models/Module.js';
import { Enrollment } from '../src/models/Enrollment.js';
import { ModuleProgress } from '../src/models/ModuleProgress.js';
import { Submission } from '../src/models/Submission.js';
import { GroomingContent } from '../src/models/GroomingContent.js';
import { AiInteractionLog } from '../src/models/AiInteractionLog.js';
import { Resume } from '../src/models/Resume.js';

import * as trainingProgramRepository from '../src/repositories/trainingProgramRepository.js';
import * as moduleRepository from '../src/repositories/moduleRepository.js';
import * as groomingRepository from '../src/repositories/groomingRepository.js';
import * as submissionRepository from '../src/repositories/submissionRepository.js';

import * as enrollmentService from '../src/services/enrollmentService.js';
import * as progressService from '../src/services/progressService.js';

import { hashPassword } from '../src/utils/hashUtils.js';
import { gradeQuiz } from '../src/utils/scoreCalculator.js';
import { sanitizeRichText } from '../src/utils/sanitizeRichText.js';

const PASSWORD = 'Password123!';

// ---------------------------------------------------------------------------
// Content definitions
// ---------------------------------------------------------------------------

const STUDENT_DEFS = [
  {
    email: 'aditi.sharma@example.com',
    fullName: 'Aditi Sharma',
    onboarded: true,
    targetRole: 'Software Development Engineer',
    targetDomain: 'Product-based',
    experienceLevel: 'fresher',
    degree: 'B.Tech',
    institution: 'NIT Trichy',
    branch: 'CSE',
    graduationYear: 2025,
    currentSkills: ['JavaScript', 'React', 'Node.js'],
    strengths: ['Problem solving', 'Communication'],
    weaknesses: ['System design'],
    preferredCompanies: ['Google', 'Microsoft'],
  },
  {
    email: 'rohan.mehta@example.com',
    fullName: 'Rohan Mehta',
    onboarded: true,
    targetRole: 'Data Analyst',
    targetDomain: 'Analytics',
    experienceLevel: '0-1yr',
    degree: 'B.Sc',
    institution: 'Delhi University',
    branch: 'Statistics',
    graduationYear: 2024,
    currentSkills: ['SQL', 'Python', 'Excel'],
    strengths: ['Attention to detail'],
    weaknesses: ['Public speaking'],
    preferredCompanies: ['Deloitte', 'EY'],
  },
  {
    email: 'priya.nair@example.com',
    fullName: 'Priya Nair',
    onboarded: true,
    targetRole: 'Backend Engineer',
    targetDomain: 'Product-based',
    experienceLevel: 'fresher',
    degree: 'B.Tech',
    institution: 'NIT Calicut',
    branch: 'CSE',
    graduationYear: 2025,
    currentSkills: ['Java', 'Spring Boot', 'MySQL'],
    strengths: ['Logical reasoning', 'Fast learner'],
    weaknesses: ['Time management'],
    preferredCompanies: ['Amazon', 'Flipkart'],
  },
  {
    email: 'karan.verma@example.com',
    fullName: 'Karan Verma',
    onboarded: true,
    targetRole: 'Product Manager',
    targetDomain: 'Product-based',
    experienceLevel: '1-3yr',
    degree: 'MBA',
    institution: 'IIM Ahmedabad',
    branch: 'General Management',
    graduationYear: 2023,
    currentSkills: ['Product strategy', 'Data analysis', 'Stakeholder management'],
    strengths: ['Communication', 'Leadership'],
    weaknesses: ['Technical depth'],
    preferredCompanies: ['Swiggy', 'Zomato'],
  },
  {
    email: 'sneha.iyer@example.com',
    fullName: 'Sneha Iyer',
    onboarded: true,
    targetRole: 'Frontend Engineer',
    targetDomain: 'Product-based',
    experienceLevel: 'fresher',
    degree: 'B.Tech',
    institution: 'VIT Vellore',
    branch: 'IT',
    graduationYear: 2025,
    currentSkills: ['HTML/CSS', 'React', 'TypeScript'],
    strengths: ['Design sense', 'Creativity'],
    weaknesses: ['Algorithms'],
    preferredCompanies: ['Adobe', 'Zoho'],
  },
  {
    email: 'arjun.reddy@example.com',
    fullName: 'Arjun Reddy',
    onboarded: true,
    targetRole: 'Software Development Engineer',
    targetDomain: 'Product-based',
    experienceLevel: 'fresher',
    degree: 'B.Tech',
    institution: 'IIT Hyderabad',
    branch: 'CSE',
    graduationYear: 2025,
    currentSkills: ['C++', 'DSA', 'System Design'],
    strengths: ['Analytical thinking'],
    weaknesses: ['Communication under pressure'],
    preferredCompanies: ['Google', 'Amazon'],
  },
  {
    email: 'meera.joshi@example.com',
    fullName: 'Meera Joshi',
    onboarded: false, // still needs to go through onboarding — demos that flow
  },
  {
    email: 'vikram.rao@example.com',
    fullName: 'Vikram Rao',
    onboarded: false,
  },
];

const PASS_CRITERIA_DEFAULT = { minOverallScorePct: 70, minPerModuleScorePct: 0 };
const PASS_CRITERIA_STRICT = { minOverallScorePct: 85, minPerModuleScorePct: 0 };

const PROGRAM_DEFS = [
  {
    title: 'Quantitative Aptitude Bootcamp',
    roundType: 'Aptitude',
    status: 'published',
    description:
      'Master number series, percentages, and time-speed-distance problems commonly asked in aptitude rounds.',
  },
  {
    title: 'Logical Reasoning Mastery',
    roundType: 'Aptitude',
    status: 'published',
    description: 'Puzzles, seating arrangements, syllogisms, and pattern recognition.',
  },
  {
    title: 'Group Discussion Essentials',
    roundType: 'GD',
    status: 'published',
    description: 'Structure, etiquette, and persuasion techniques for group discussion rounds.',
  },
  {
    title: 'Advanced GD Strategies',
    roundType: 'GD',
    status: 'draft',
    description: 'Handling contentious topics and steering group consensus. (Admin still drafting this one.)',
  },
  {
    title: 'Data Structures & Algorithms',
    roundType: 'Technical',
    status: 'published',
    description: 'Arrays, trees, graphs, and common interview coding patterns.',
    passCriteria: PASS_CRITERIA_STRICT,
  },
  {
    title: 'System Design Fundamentals',
    roundType: 'Technical',
    status: 'published',
    description: 'Scalability, load balancing, caching, and designing real-world systems.',
  },
  {
    title: 'HR Interview Readiness',
    roundType: 'HR',
    status: 'published',
    description: 'Behavioral questions, salary negotiation, and closing the interview strong.',
  },
  {
    title: 'Behavioral Interview Mastery',
    roundType: 'HR',
    status: 'draft',
    description: 'STAR-method storytelling for behavioral rounds. (Admin still drafting this one.)',
  },
];

const QUIZ_BY_ROUND = {
  Aptitude: [
    {
      questionText: 'If a train travels 300 km in 5 hours, what is its average speed?',
      type: 'mcq',
      options: ['50 km/h', '60 km/h', '65 km/h', '70 km/h'],
      correctAnswerIndex: 1,
      points: 1,
    },
    {
      questionText: 'What is 15% of 240?',
      type: 'mcq',
      options: ['30', '36', '40', '45'],
      correctAnswerIndex: 1,
      points: 1,
    },
    {
      questionText: 'Complete the series: 2, 6, 12, 20, __',
      type: 'short_answer',
      correctAnswerText: '30',
      points: 1,
    },
  ],
  GD: [
    {
      questionText: 'What is the most important skill to demonstrate in a group discussion?',
      type: 'mcq',
      options: ['Speaking the loudest', 'Active listening', 'Interrupting others', 'Staying silent'],
      correctAnswerIndex: 1,
      points: 1,
    },
    {
      questionText: 'A good GD closing statement should:',
      type: 'mcq',
      options: [
        'Introduce a new topic',
        'Summarize key points discussed',
        'Repeat your own points only',
        'Criticize other participants',
      ],
      correctAnswerIndex: 1,
      points: 1,
    },
    {
      questionText: 'Name one technique for entering a group discussion politely when it is already underway.',
      type: 'short_answer',
      correctAnswerText: 'building on a previous point',
      points: 1,
    },
  ],
  Technical: [
    {
      questionText: 'What is the time complexity of binary search on a sorted array?',
      type: 'mcq',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
      correctAnswerIndex: 1,
      points: 1,
    },
    {
      questionText: 'Which data structure follows LIFO order?',
      type: 'mcq',
      options: ['Queue', 'Stack', 'Linked List', 'Tree'],
      correctAnswerIndex: 1,
      points: 1,
    },
    {
      questionText: 'Name the tree traversal that visits root, then left, then right.',
      type: 'short_answer',
      correctAnswerText: 'preorder',
      points: 1,
    },
  ],
  HR: [
    {
      questionText: 'What does the STAR method stand for in behavioral interviews?',
      type: 'mcq',
      options: [
        'Situation Task Action Result',
        'Skill Task Ability Response',
        'Story Task Action Review',
        'Situation Time Action Response',
      ],
      correctAnswerIndex: 0,
      points: 1,
    },
    {
      questionText: "What's the best approach when asked 'What is your biggest weakness?'",
      type: 'mcq',
      options: [
        "Say you don't have any weaknesses",
        'Name a real growth area and how you are improving it',
        'Criticize a former manager',
        'Give an unrelated answer',
      ],
      correctAnswerIndex: 1,
      points: 1,
    },
    {
      questionText: 'Name one thing you should always bring to an in-person interview.',
      type: 'short_answer',
      correctAnswerText: 'resume copies',
      points: 1,
    },
  ],
};

const FOCUS_AREA_BY_ROUND = {
  Aptitude: 'quantitative reasoning',
  GD: 'group discussion',
  Technical: 'data structures & algorithms',
  HR: null,
};

const GD_PROMPT_BY_ROUND = {
  Aptitude: 'Should calculators be allowed in all competitive exams?',
  GD: 'Should social media platforms be regulated by the government?',
  Technical: 'Is it better to specialize deeply in one tech stack or be a generalist?',
  HR: 'Describe a time you had to give difficult feedback to a peer.',
};

function buildMaterialBody(roundType) {
  const intros = {
    Aptitude:
      '<p>Aptitude rounds test how quickly and accurately you can reason through numbers. Focus on mental math shortcuts for percentages, ratios, and speed/time problems — most questions are solvable in under a minute once the pattern clicks.</p><p>Practice a mixed set of 20 questions daily rather than drilling one topic for hours.</p>',
    GD: '<p>A group discussion evaluates communication and collaboration, not just opinions. Enter early with a structuring statement, build on others\' points by name, and close by summarizing rather than repeating your own view.</p>',
    Technical:
      '<p>Technical rounds reward clear communication of your thought process as much as the final answer. Always state your approach, discuss time/space complexity, and mention edge cases before writing code.</p>',
    HR: '<p>HR rounds assess culture fit and communication. Prepare 3-4 STAR-format stories in advance (a challenge, a conflict, a failure, a leadership moment) so you can adapt them to whatever question comes up.</p>',
  };
  return intros[roundType];
}

const GROOMING_DEFS = [
  {
    title: 'Dressing for Success: The Business Casual Guide',
    category: 'dress_code',
    status: 'published',
    body: '<p>Business casual means a collared shirt or blouse, tailored trousers or a knee-length skirt, and closed-toe shoes. Avoid strong perfumes/colognes and keep accessories minimal — the goal is to look put-together without drawing attention away from what you say.</p>',
  },
  {
    title: 'Mastering Eye Contact and Posture',
    category: 'body_language',
    status: 'published',
    body: '<p>Maintain eye contact roughly 60-70% of the time — enough to seem engaged, not so much it feels intense. Sit slightly forward, keep shoulders relaxed, and avoid crossing your arms, which can read as defensive even unintentionally.</p>',
  },
  {
    title: 'Speaking with Clarity and Confidence',
    category: 'communication',
    status: 'published',
    body: '<p>Slow down — nervous candidates tend to speed up. Pause briefly before answering to organize your thoughts; a two-second pause reads as thoughtful, not unprepared. Avoid filler words like "um" by simply allowing silence instead.</p>',
  },
  {
    title: 'Structuring a Winning Self-Introduction',
    category: 'presentation',
    status: 'published',
    body: '<p>A strong self-introduction is under 90 seconds: (1) who you are and your current role/education, (2) one or two relevant achievements, (3) why you are excited about this specific opportunity. Practice it until it sounds natural, not memorized.</p>',
  },
  {
    title: 'Video Interview Etiquette',
    category: 'other',
    status: 'published',
    body: '<p>Test your camera/mic and internet 30 minutes beforehand. Use a plain background, look at the camera (not the screen) when speaking, and keep notes just off-camera rather than reading directly from them.</p>',
  },
  {
    title: 'Reading the Room in a Panel Interview',
    category: 'body_language',
    status: 'draft',
    body: '<p>(Draft — expand with tips on addressing multiple interviewers, distributing eye contact across a panel, and identifying the most senior panelist\'s cues.)</p>',
  },
];

// Who enrolls in what, and how their attempt should play out. Every module
// type is exercised across these plans: material is always completed;
// 'strong' passes quiz + AI interview + GD (admin-reviewed pass); 'weak'
// fails all three (admin-reviewed fail); 'partial' completes material+quiz
// only and leaves a GD submission sitting in the admin review queue
// (unreviewed), so the enrollment stays in_progress.
const ENROLLMENT_PLAN = [
  { studentEmail: 'aditi.sharma@example.com', programTitle: 'Quantitative Aptitude Bootcamp', archetype: 'strong' },
  { studentEmail: 'aditi.sharma@example.com', programTitle: 'Group Discussion Essentials', archetype: 'partial' },
  { studentEmail: 'rohan.mehta@example.com', programTitle: 'Data Structures & Algorithms', archetype: 'weak' },
  { studentEmail: 'rohan.mehta@example.com', programTitle: 'HR Interview Readiness', archetype: 'strong' },
  { studentEmail: 'priya.nair@example.com', programTitle: 'Logical Reasoning Mastery', archetype: 'strong' },
  { studentEmail: 'priya.nair@example.com', programTitle: 'Data Structures & Algorithms', archetype: 'partial' },
  { studentEmail: 'karan.verma@example.com', programTitle: 'HR Interview Readiness', archetype: 'strong' },
  { studentEmail: 'karan.verma@example.com', programTitle: 'Group Discussion Essentials', archetype: 'strong' },
  { studentEmail: 'sneha.iyer@example.com', programTitle: 'System Design Fundamentals', archetype: 'partial' },
  { studentEmail: 'sneha.iyer@example.com', programTitle: 'Quantitative Aptitude Bootcamp', archetype: 'weak' },
  { studentEmail: 'arjun.reddy@example.com', programTitle: 'Data Structures & Algorithms', archetype: 'strong' },
  { studentEmail: 'arjun.reddy@example.com', programTitle: 'System Design Fundamentals', archetype: 'strong' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQuizAnswers(questions, numCorrect) {
  return questions.map((q, i) => {
    if (i < numCorrect) {
      return {
        questionIndex: i,
        answerText: q.type === 'mcq' ? String(q.correctAnswerIndex) : q.correctAnswerText,
      };
    }
    if (q.type === 'mcq') {
      const wrongIndex = (q.correctAnswerIndex + 1) % q.options.length;
      return { questionIndex: i, answerText: String(wrongIndex) };
    }
    return { questionIndex: i, answerText: 'not sure' };
  });
}

function buildInterviewQA(focusArea, isStrong) {
  const questions = [
    `Tell me about a challenging project related to ${focusArea || 'your field'}.`,
    'How do you handle tight deadlines?',
    'Describe a time you disagreed with a teammate and how you resolved it.',
  ];
  return questions.map((question) => ({
    question,
    answerText: isStrong
      ? 'I broke the problem into smaller parts, communicated proactively with stakeholders about progress and risks, and delivered on time by prioritizing the highest-impact pieces first.'
      : 'I just tried my best and it worked out eventually, I did not really plan it out.',
    aiEvaluation: {
      verdict: isStrong ? 'pass' : 'fail',
      feedback: isStrong
        ? 'Clear, structured answer with concrete detail and a visible thought process.'
        : 'Answer lacks structure and specific detail — try the STAR method (Situation, Task, Action, Result).',
      score: isStrong ? 82 + Math.floor(Math.random() * 12) : 22 + Math.floor(Math.random() * 15),
      promptVersion: 'interviewEvaluation@1',
      evaluatedAt: new Date(),
    },
  }));
}

function buildGdResponse(prompt, isStrong) {
  return isStrong
    ? `Regarding "${prompt}" — I believe a balanced approach works best. On one hand there are clear benefits, but they need to be weighed against practical constraints. Considering the evidence, I'd advocate for a measured, phased approach that allows adjustment as we learn more.`
    : `About "${prompt}" — I think it's a tricky topic and there are many opinions about it.`;
}

function findProgram(programs, title) {
  const entry = programs.find((p) => p.program.title === title);
  if (!entry) throw new Error(`Seed data error: program "${title}" not found`);
  return entry;
}

function findModule(programEntry, type) {
  const module = programEntry.modules.find((m) => m.type === type);
  if (!module) throw new Error(`Seed data error: module type "${type}" not found on "${programEntry.program.title}"`);
  return module;
}

function findStudent(students, email) {
  const student = students.find((s) => s.user.email === email);
  if (!student) throw new Error(`Seed data error: student "${email}" not found`);
  return student;
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function clearDatabase() {
  await Promise.all([
    User.deleteMany({}),
    Profile.deleteMany({}),
    TrainingProgram.deleteMany({}),
    Module.deleteMany({}),
    Enrollment.deleteMany({}),
    ModuleProgress.deleteMany({}),
    Submission.deleteMany({}),
    GroomingContent.deleteMany({}),
    AiInteractionLog.deleteMany({}),
    Resume.deleteMany({}),
  ]);
}

async function seedAdmin() {
  const passwordHash = await hashPassword(PASSWORD);
  return User.create({
    email: 'admin@example.com',
    passwordHash,
    role: 'admin',
    onboardingCompleted: true,
    lastLoginAt: new Date(),
  });
}

async function seedStudents() {
  const created = [];
  for (const def of STUDENT_DEFS) {
    const passwordHash = await hashPassword(PASSWORD);
    const user = await User.create({
      email: def.email,
      passwordHash,
      role: 'student',
      onboardingCompleted: def.onboarded,
      lastLoginAt: new Date(),
    });

    if (def.onboarded) {
      const onboardingAnswersRaw = {
        education: {
          degree: def.degree,
          institution: def.institution,
          branch: def.branch,
          graduationYear: def.graduationYear,
        },
        targetRole: def.targetRole,
        targetDomain: def.targetDomain,
        experienceLevel: def.experienceLevel,
        currentSkills: def.currentSkills,
        strengths: def.strengths,
        weaknesses: def.weaknesses,
        preferredCompanies: def.preferredCompanies,
      };

      await Profile.create({
        user: user._id,
        fullName: def.fullName,
        education: onboardingAnswersRaw.education,
        targetRole: def.targetRole,
        targetDomain: def.targetDomain,
        experienceLevel: def.experienceLevel,
        currentSkills: def.currentSkills,
        strengths: def.strengths,
        weaknesses: def.weaknesses,
        preferredCompanies: def.preferredCompanies,
        onboardingAnswersRaw,
        aiSummary: {
          text: `${def.fullName} is a ${def.experienceLevel} candidate targeting ${def.targetRole} roles, with hands-on skills in ${def.currentSkills.slice(0, 2).join(' and ')}. Recommended focus: sharpen the areas listed as weaknesses before final interviews.`,
          suggestedTracks: ['Aptitude', 'Technical', 'HR'],
          generatedAt: new Date(),
          promptVersion: 'profileSummary@1',
          model: 'seed-data',
        },
        ruleBasedProfile: { level: def.experienceLevel, recommendedTrackIds: [] },
      });
    }

    created.push({ user, def });
  }
  return created;
}

async function seedTrainingPrograms(adminId) {
  const created = [];
  for (const def of PROGRAM_DEFS) {
    const program = await trainingProgramRepository.create({
      title: def.title,
      description: def.description,
      roundType: def.roundType,
      status: def.status,
      passCriteria: def.passCriteria ?? PASS_CRITERIA_DEFAULT,
      estimatedDurationMins: 90,
      tags: [def.roundType.toLowerCase()],
      createdBy: adminId,
      publishedAt: def.status === 'published' ? new Date() : null,
    });

    const moduleDefs = [
      {
        type: 'material',
        title: 'Getting Started',
        instructions: 'Read through this material before attempting the quiz.',
        contentBody: sanitizeRichText(buildMaterialBody(def.roundType)),
        isRequired: true,
        status: 'published',
      },
      {
        type: 'quiz',
        title: 'Concept Check',
        instructions: 'Answer all questions to the best of your ability.',
        questions: QUIZ_BY_ROUND[def.roundType],
        isRequired: true,
        status: 'published',
      },
      {
        type: 'ai_interview',
        title: 'Mock Interview Round',
        instructions: 'Answer each question as you would in a real interview.',
        focusArea: FOCUS_AREA_BY_ROUND[def.roundType],
        numQuestions: 3,
        difficulty: 'medium',
        isRequired: true,
        status: 'published',
      },
      {
        type: 'gd_submission',
        title: 'Practice Submission',
        instructions: 'Submit a written response to the prompt below.',
        prompt: GD_PROMPT_BY_ROUND[def.roundType],
        submissionMode: 'text',
        reviewMode: 'both',
        isRequired: true,
        status: 'published',
      },
    ];

    const modules = [];
    for (const moduleDef of moduleDefs) {
      const { type, ...data } = moduleDef;
      const module = await moduleRepository.createModule(type, { ...data, program: program._id });
      await trainingProgramRepository.addModuleToOrder(program._id, module._id);
      modules.push(module);
    }

    created.push({ program, modules });
  }
  return created;
}

async function seedGrooming(adminId) {
  for (const def of GROOMING_DEFS) {
    await groomingRepository.create({ ...def, body: sanitizeRichText(def.body), createdBy: adminId });
  }
}

async function seedEnrollmentsAndProgress(students, programs, adminId) {
  for (const plan of ENROLLMENT_PLAN) {
    const student = findStudent(students, plan.studentEmail);
    const programEntry = findProgram(programs, plan.programTitle);
    const enrollment = await enrollmentService.enroll(student.user._id, programEntry.program._id);

    const material = findModule(programEntry, 'material');
    const quiz = findModule(programEntry, 'quiz');
    const interview = findModule(programEntry, 'ai_interview');
    const gd = findModule(programEntry, 'gd_submission');

    // Material: always marked read.
    await progressService.recordModuleResult(enrollment._id, material._id, {
      scorePct: 100,
      submissionId: null,
    });

    // Quiz: score depends on archetype.
    const numCorrect = plan.archetype === 'strong' ? 3 : plan.archetype === 'partial' ? 2 : 1;
    const answers = buildQuizAnswers(quiz.questions, numCorrect);
    const { graded, scorePct: quizScore } = gradeQuiz(quiz.questions, answers);
    const quizSubmission = await submissionRepository.create({
      student: student.user._id,
      module: quiz._id,
      enrollment: enrollment._id,
      type: 'quiz',
      attemptNumber: 1,
      quizAnswers: graded,
      finalScorePct: quizScore,
      status: 'graded',
      performanceTips: {
        text:
          plan.archetype === 'weak'
            ? 'Revisit the fundamentals covered in the material section and retry — focus on the questions you missed.'
            : 'Solid quiz performance — keep timing yourself to stay quick under pressure.',
        generatedAt: new Date(),
        promptVersion: 'performanceTips@1',
      },
    });
    await progressService.recordModuleResult(enrollment._id, quiz._id, {
      scorePct: quizScore,
      submissionId: quizSubmission._id,
    });

    if (plan.archetype === 'partial') {
      // Submitted, sitting in the admin GD review queue — not yet completed.
      await submissionRepository.create({
        student: student.user._id,
        module: gd._id,
        enrollment: enrollment._id,
        type: 'gd_submission',
        attemptNumber: 1,
        gdTextResponse: buildGdResponse(gd.prompt, true),
        gdReview: { verdict: 'pending' },
        status: 'under_review',
      });
      continue;
    }

    const isStrong = plan.archetype === 'strong';

    // AI mock interview.
    const interviewQA = buildInterviewQA(interview.focusArea, isStrong);
    const avgScore = Math.round(interviewQA.reduce((sum, qa) => sum + qa.aiEvaluation.score, 0) / interviewQA.length);
    const interviewSubmission = await submissionRepository.create({
      student: student.user._id,
      module: interview._id,
      enrollment: enrollment._id,
      type: 'ai_interview',
      attemptNumber: 1,
      interviewQA,
      interviewGenPromptVersion: 'interviewQuestionGen@1',
      questionsReady: true,
      finalScorePct: avgScore,
      status: 'graded',
      performanceTips: {
        text: isStrong
          ? 'Great structured answers — keep practicing to stay sharp before the real interview.'
          : 'Review the STAR method (Situation, Task, Action, Result) and retry with more specific detail.',
        generatedAt: new Date(),
        promptVersion: 'performanceTips@1',
      },
    });
    await progressService.recordModuleResult(enrollment._id, interview._id, {
      scorePct: avgScore,
      submissionId: interviewSubmission._id,
    });

    // GD submission, already admin-reviewed.
    const gdSubmission = await submissionRepository.create({
      student: student.user._id,
      module: gd._id,
      enrollment: enrollment._id,
      type: 'gd_submission',
      attemptNumber: 1,
      gdTextResponse: buildGdResponse(gd.prompt, isStrong),
      gdReview: {
        reviewedBy: adminId,
        verdict: isStrong ? 'pass' : 'fail',
        comments: isStrong
          ? 'Well-structured and persuasive response — good use of a balanced viewpoint.'
          : 'Response lacks depth — expand on your reasoning and take a clearer stance next time.',
        reviewedAt: new Date(),
      },
      finalScorePct: isStrong ? 100 : 0,
      status: 'graded',
    });
    await progressService.recordModuleResult(enrollment._id, gd._id, {
      scorePct: isStrong ? 100 : 0,
      submissionId: gdSubmission._id,
    });
  }
}

async function seedAiLogs(students) {
  const ops = [
    ['profile_summary', 'success', 'profileSummary@1'],
    ['interview_question_gen', 'success', 'interviewQuestionGen@1'],
    ['interview_evaluate', 'success', 'interviewEvaluation@1'],
    ['content_draft', 'success', 'contentDraft@1'],
    ['gd_review_assist', 'success', 'gdReviewAssist@1'],
    ['grooming_personalize', 'success', 'groomingPersonalize@1'],
    ['performance_tips', 'success', 'performanceTips@1'],
    ['training_recommend', 'fallback', 'trainingRecommend@1'],
    ['interview_evaluate', 'error', 'interviewEvaluation@1'],
    ['resume_polish', 'success', 'resumePolish@1'],
  ];
  const entries = ops.flatMap(([operation, status, promptVersion], opIndex) =>
    Array.from({ length: 3 }, (_, i) => ({
      user: students[(opIndex + i) % students.length].user._id,
      operation,
      status,
      promptVersion,
      latencyMs: 300 + Math.floor(Math.random() * 1500),
      createdAt: new Date(Date.now() - (opIndex * 3 + i) * 3600 * 1000),
    })),
  );
  await AiInteractionLog.insertMany(entries);
}

function printSummary(admin, students, programs) {
  const onboarded = students.filter((s) => s.def.onboarded);
  const notOnboarded = students.filter((s) => !s.def.onboarded);
  const published = programs.filter((p) => p.program.status === 'published');
  const draft = programs.filter((p) => p.program.status === 'draft');

  console.log('\n================ Seed complete ================\n');
  console.log(`All accounts use the password: ${PASSWORD}\n`);
  console.log(`Admin login:      ${admin.email}`);
  console.log(`\nStudents (onboarded, ready to explore trainings):`);
  onboarded.forEach((s) => console.log(`  - ${s.user.email}  (${s.def.fullName}, targeting ${s.def.targetRole})`));
  console.log(`\nStudents (NOT onboarded — log in to see the onboarding wizard):`);
  notOnboarded.forEach((s) => console.log(`  - ${s.user.email}  (${s.def.fullName})`));
  console.log(`\nTraining programs: ${published.length} published, ${draft.length} draft`);
  published.forEach((p) => console.log(`  - ${p.program.title} (${p.program.roundType})`));
  draft.forEach((p) => console.log(`  - ${p.program.title} (${p.program.roundType}) [draft]`));
  console.log(`\nGrooming articles: ${GROOMING_DEFS.length} (${GROOMING_DEFS.filter((g) => g.status === 'draft').length} draft)`);
  console.log(`\nEnrollments: ${ENROLLMENT_PLAN.length} across ${new Set(ENROLLMENT_PLAN.map((p) => p.studentEmail)).size} students`);
  console.log(`  - Some 'passed', some 'failed', some 'in_progress' with a GD submission`);
  console.log(`    sitting in the admin GD review queue (log in as admin -> GD Queue).`);
  console.log(`\nTip: log in as a student with a 'passed' enrollment (e.g. aditi.sharma@example.com`);
  console.log(`     after passing Quantitative Aptitude Bootcamp) and try Resume generation live —`);
  console.log(`     that's the one pipeline this seeder intentionally leaves for you to trigger for`);
  console.log(`     real, since it calls Gemini + renders a real PDF via Puppeteer.`);
  console.log('\n=================================================\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (env.isProduction) {
    throw new Error('Refusing to run the seeder with NODE_ENV=production — this wipes the database.');
  }

  await connectDb();
  console.log('Connected to database. Clearing existing data...');
  await clearDatabase();

  console.log('Seeding admin + students...');
  const admin = await seedAdmin();
  const students = await seedStudents();

  console.log('Seeding training programs + modules...');
  const programs = await seedTrainingPrograms(admin._id);

  console.log('Seeding grooming content...');
  await seedGrooming(admin._id);

  console.log('Seeding enrollments, submissions, and progress...');
  await seedEnrollmentsAndProgress(students, programs, admin._id);

  console.log('Seeding AI usage history...');
  await seedAiLogs(students);

  printSummary(admin, students, programs);

  await disconnectDb();
}

// Only auto-run when executed directly (`node scripts/seed.js`), not when
// imported — keeps this script safely importable for verification/testing.
const isMainModule = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isMainModule) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

export { main };
