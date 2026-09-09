// Round types are the product's real information architecture — students
// move through them as a sequence, and each is a different kind of
// challenge. Giving each its own identity here (used consistently across
// catalog, modules, progress, and admin views) means a student recognizes
// what kind of thing they're looking at before reading a word of it.
export const ROUND_META = {
  Aptitude: {
    label: 'Aptitude',
    blurb: 'Speed and accuracy under time pressure',
    text: 'text-aptitude',
    soft: 'bg-aptitude-soft',
    dot: 'bg-aptitude',
    ring: 'ring-aptitude/25',
  },
  GD: {
    label: 'Group discussion',
    blurb: 'Communication and collaboration',
    text: 'text-gd',
    soft: 'bg-gd-soft',
    dot: 'bg-gd',
    ring: 'ring-gd/25',
  },
  Technical: {
    label: 'Technical',
    blurb: 'Problem solving and depth',
    text: 'text-technical',
    soft: 'bg-technical-soft',
    dot: 'bg-technical',
    ring: 'ring-technical/25',
  },
  HR: {
    label: 'HR',
    blurb: 'Fit, motivation, and self-awareness',
    text: 'text-hr',
    soft: 'bg-hr-soft',
    dot: 'bg-hr',
    ring: 'ring-hr/25',
  },
};

export const ROUND_ORDER = ['Aptitude', 'GD', 'Technical', 'HR'];

export const MODULE_META = {
  material: { label: 'Reading', verb: 'Read' },
  quiz: { label: 'Quiz', verb: 'Take quiz' },
  ai_interview: { label: 'Mock interview', verb: 'Start interview' },
  gd_submission: { label: 'Submission', verb: 'Submit response' },
};

export const STATUS_TONE = {
  passed: 'pass',
  completed: 'pass',
  pass: 'pass',
  failed: 'fail',
  fail: 'fail',
  in_progress: 'pending',
  under_review: 'pending',
  pending: 'pending',
  not_started: 'neutral',
  draft: 'neutral',
  published: 'pass',
  graded: 'pass',
  submitted: 'pending',
};

export const STATUS_LABEL = {
  passed: 'Passed',
  failed: 'Not passed',
  in_progress: 'In progress',
  not_started: 'Not started',
  completed: 'Completed',
  under_review: 'Awaiting review',
  pending: 'Awaiting review',
  graded: 'Reviewed',
  submitted: 'Submitted',
  draft: 'Draft',
  published: 'Published',
  pass: 'Pass',
  fail: 'Fail',
};
