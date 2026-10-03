// Rule-based resume field extraction, used when Gemini is unavailable. It
// only fills what it can find with reasonable confidence — anything else
// is left blank for the student to fill in, which beats a confident guess.

const SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Kotlin', 'Swift', 'PHP', 'Ruby',
  'Rust', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'React', 'Angular', 'Vue', 'Next.js',
  'Node.js', 'Express', 'Django', 'Flask', 'Spring Boot', 'HTML', 'CSS', 'Tailwind', 'Bootstrap',
  'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Linux', 'Machine Learning',
  'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Excel', 'Power BI', 'Tableau',
  'Data Analysis', 'Data Structures', 'Algorithms', 'REST API', 'GraphQL', 'Figma', 'Redux',
];

const DEGREES = [
  [/\bB\.?\s?Tech\b/i, 'B.Tech'],
  [/\bM\.?\s?Tech\b/i, 'M.Tech'],
  [/\bB\.?\s?E\.?(?=\s|,|$)/, 'B.E.'],
  [/\bMBA\b/, 'MBA'],
  [/\bMCA\b/, 'MCA'],
  [/\bBCA\b/, 'BCA'],
  [/\bB\.?\s?Sc\b/i, 'B.Sc'],
  [/\bM\.?\s?Sc\b/i, 'M.Sc'],
  [/\bB\.?\s?Com\b/i, 'B.Com'],
  [/\bBBA\b/, 'BBA'],
  [/\bPh\.?\s?D\b/i, 'PhD'],
];

const BRANCHES = [
  [/computer science|\bCSE\b/i, 'Computer Science'],
  [/information technology|\bIT\b(?= |,)/, 'Information Technology'],
  [/electronics( and| &)? communication|\bECE\b/i, 'Electronics & Communication'],
  [/electrical/i, 'Electrical'],
  [/mechanical/i, 'Mechanical'],
  [/civil engineering/i, 'Civil'],
  [/data science/i, 'Data Science'],
  [/artificial intelligence/i, 'Artificial Intelligence'],
];

const INSTITUTION_HINT = /(university|institute|college|\bIIT\b|\bNIT\b|\bIIIT\b|school of)/i;
const ROLE_HINT = /(engineer|developer|analyst|designer|manager|scientist|consultant|architect)/i;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSkills(text) {
  return SKILLS.filter((skill) => {
    // Word boundaries don't work after symbols like "++" or "#", so match on
    // "not a letter/digit" on either side instead.
    const pattern = new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(skill)}(?![A-Za-z0-9])`, 'i');
    return pattern.test(text);
  });
}

function findFullName(lines) {
  return lines
    .slice(0, 5)
    .find((line) => /^[A-Za-z][A-Za-z.'-]*( [A-Za-z][A-Za-z.'-]*){1,3}$/.test(line) && !ROLE_HINT.test(line));
}

function findGraduationYear(text) {
  const thisYear = new Date().getFullYear();
  const years = (text.match(/\b(19[89]\d|20\d\d)\b/g) ?? [])
    .map(Number)
    .filter((y) => y >= 1980 && y <= thisYear + 6);
  return years.length ? Math.max(...years) : undefined;
}

function findExperienceLevel(text) {
  const match = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|work\s+)?experience/i);
  if (!match) return 'fresher';
  const years = Number(match[1]);
  if (years >= 3) return '3+yr';
  if (years >= 1) return '1-3yr';
  return '0-1yr';
}

export function extractProfileFromResumeText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const degree = DEGREES.find(([pattern]) => pattern.test(text))?.[1];
  const branch = BRANCHES.find(([pattern]) => pattern.test(text))?.[1];
  const institution = lines.find((line) => INSTITUTION_HINT.test(line));
  const targetRole = lines.slice(0, 8).find((line) => ROLE_HINT.test(line) && line.length <= 80);

  return {
    fullName: findFullName(lines),
    education: {
      degree,
      institution,
      branch,
      graduationYear: findGraduationYear(text),
    },
    targetRole,
    experienceLevel: findExperienceLevel(text),
    currentSkills: findSkills(text),
  };
}
