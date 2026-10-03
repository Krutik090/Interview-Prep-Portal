import { jest } from '@jest/globals';
import puppeteer from 'puppeteer';
import request from 'supertest';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';

const mockGenerateContent = jest.fn();
jest.unstable_mockModule('../../src/config/geminiClient.js', () => ({
  generateContent: mockGenerateContent,
  isRateLimitError: () => false,
  isTransientError: () => true,
}));

const mockQueueAdd = jest.fn().mockResolvedValue({});
jest.unstable_mockModule('../../src/jobs/queues.js', () => ({
  QUEUE_NAMES: { AI_PROFILE: 'ai-profile' },
  getQueue: () => ({ add: mockQueueAdd }),
}));

const { createApp } = await import('../../src/app.js');
const { Profile } = await import('../../src/models/Profile.js');
const app = createApp();

const RESUME_HTML = `
  <h1>Riya Kapoor</h1>
  <p>Software Developer</p>
  <p>riya.kapoor@example.com</p>
  <h2>Education</h2>
  <p>B.Tech in Computer Science</p>
  <p>Delhi Technological University</p>
  <p>2021 - 2025</p>
  <h2>Skills</h2>
  <p>JavaScript, React, Node.js, MongoDB, Python, Git</p>
  <h2>Experience</h2>
  <p>Software Engineering Intern, Acme Corp (Summer 2024): built internal dashboards.</p>
`;

let resumePdf;
let blankPdf;

async function renderPdf(html) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(`<html><body>${html}</body></html>`);
    return Buffer.from(await page.pdf({ format: 'A4' }));
  } finally {
    await browser.close();
  }
}

beforeAll(async () => {
  await connect();
  resumePdf = await renderPdf(RESUME_HTML);
  blankPdf = await renderPdf(''); // no text layer — like a scanned resume
}, 60000);
afterEach(async () => {
  await clearDatabase();
  mockGenerateContent.mockReset();
  mockQueueAdd.mockClear();
});
afterAll(async () => closeDatabase());

async function newStudent() {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'riya@example.com', password: 'correct horse battery' });
  return res.body.accessToken;
}

function upload(token, buffer, { filename = 'resume.pdf', contentType = 'application/pdf' } = {}) {
  return request(app)
    .post('/api/v1/onboarding/parse-resume')
    .set('Authorization', `Bearer ${token}`)
    .attach('resume', buffer, { filename, contentType });
}

describe('Resume upload during onboarding', () => {
  it('fills the profile from a real PDF using rule-based extraction when Gemini is unavailable', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini is down'));
    const token = await newStudent();

    const res = await upload(token, resumePdf);

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('rule-based');
    const { prefill } = res.body;
    expect(prefill.fullName).toBe('Riya Kapoor');
    expect(prefill.education.degree).toBe('B.Tech');
    expect(prefill.education.branch).toBe('Computer Science');
    expect(prefill.education.institution).toMatch(/Delhi Technological University/);
    expect(prefill.education.graduationYear).toBe(2025);
    expect(prefill.experienceLevel).toBe('fresher');
    expect(prefill.currentSkills).toEqual(
      expect.arrayContaining(['JavaScript', 'React', 'Node.js', 'MongoDB', 'Python', 'Git']),
    );
  }, 30000);

  it('uses the AI result when Gemini responds, normalized to what the form accepts', async () => {
    mockGenerateContent.mockResolvedValue(
      JSON.stringify({
        fullName: 'Riya Kapoor',
        education: { degree: 'B.Tech', institution: 'DTU', branch: 'CSE', graduationYear: '2025' },
        targetRole: 'Software Developer',
        experienceLevel: 'intern', // not a valid option — must be dropped, not break parsing
        currentSkills: ['React', 'react', 'Node.js', ''],
        strengths: ['Ownership'],
      }),
    );
    const token = await newStudent();

    const res = await upload(token, resumePdf);

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('ai');
    expect(res.body.prefill.education.graduationYear).toBe(2025);
    expect(res.body.prefill.experienceLevel).toBeUndefined();
    expect(res.body.prefill.currentSkills).toEqual(['React', 'Node.js']); // de-duplicated, blanks removed
  }, 30000);

  it('rejects a file that claims to be a PDF but is not one', async () => {
    const token = await newStudent();
    const res = await upload(token, Buffer.from('<script>not a pdf</script>'));
    expect(res.status).toBe(400);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('rejects a non-PDF content type outright', async () => {
    const token = await newStudent();
    const res = await upload(token, Buffer.from('hello'), {
      filename: 'resume.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(res.status).toBe(400);
  });

  it('explains that a PDF with no readable text should be filled in manually', async () => {
    const token = await newStudent();
    const res = await upload(token, blankPdf);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/fill in your details manually/i);
  }, 30000);

  it('asks for a file when none is attached', async () => {
    const token = await newStudent();
    const res = await request(app)
      .post('/api/v1/onboarding/parse-resume')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/onboarding/parse-resume')
      .attach('resume', resumePdf, { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(401);
  });

  it('is not available once onboarding is complete', async () => {
    const token = await newStudent();
    await request(app)
      .post('/api/v1/onboarding/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        education: { degree: 'B.Tech', institution: 'DTU', graduationYear: 2025 },
        targetRole: 'Developer',
        experienceLevel: 'fresher',
        currentSkills: ['React'],
      })
      .expect(201);

    const res = await upload(token, resumePdf);
    expect(res.status).toBe(409);
  });

  it('saves the full name submitted with onboarding', async () => {
    const token = await newStudent();
    await request(app)
      .post('/api/v1/onboarding/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Riya Kapoor',
        education: { degree: 'B.Tech', institution: 'DTU', graduationYear: 2025 },
        targetRole: 'Developer',
        experienceLevel: 'fresher',
        currentSkills: ['React'],
      })
      .expect(201);

    const profile = await Profile.findOne({});
    expect(profile.fullName).toBe('Riya Kapoor');
  });
});
