import path from 'node:path';
import fs from 'node:fs/promises';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import { Worker } from 'bullmq';
import { createRedisConnection } from '../../config/redis.js';
import { QUEUE_NAMES } from '../queues.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import * as profileRepository from '../../repositories/profileRepository.js';
import * as enrollmentRepository from '../../repositories/enrollmentRepository.js';
import * as resumeRepository from '../../repositories/resumeRepository.js';
import { polishResumeContent } from '../../services/aiService.js';

const TEMPLATE_PATH = path.join(process.cwd(), 'src/templates/resume/default.ejs');

function toProfileSnapshot(profile) {
  return {
    fullName: profile?.fullName,
    targetRole: profile?.targetRole,
    experienceLevel: profile?.experienceLevel,
    currentSkills: profile?.currentSkills ?? [],
    strengths: profile?.strengths ?? [],
    education: profile?.education,
  };
}

async function generateResume(studentId) {
  const profile = await profileRepository.findByUser(studentId);
  const enrollments = await enrollmentRepository.listByStudent(studentId);
  const passed = enrollments.filter((e) => e.status === 'passed');

  if (passed.length === 0) {
    logger.warn({ studentId }, 'resume-generate job: no passed enrollments, skipping');
    await resumeRepository.updateByStudent(studentId, { status: 'failed' });
    return;
  }

  const completedPrograms = passed.map((e) => ({
    program: e.program?._id,
    title: e.program?.title,
    roundType: e.program?.roundType,
    scorePct: e.overallScorePct,
  }));
  const profileSnapshot = toProfileSnapshot(profile);

  const aiContent = await polishResumeContent({
    userId: studentId,
    profileSnapshot,
    completedPrograms,
  });

  const html = await ejs.renderFile(TEMPLATE_PATH, {
    profile: profileSnapshot,
    aiContent,
    completedPrograms,
  });

  const resume = await resumeRepository.findByStudent(studentId);
  if (!resume) {
    logger.warn({ studentId }, 'resume-generate job: no pending resume doc found, skipping');
    return;
  }
  const relativeDir = path.join('resumes', String(studentId));
  const fileName = `resume-v${resume.version}.pdf`;
  const absoluteDir = path.join(process.cwd(), env.STORAGE_ROOT, relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, fileName);

  // Run Puppeteer inside this worker process (separate from the API
  // process) so a Chromium crash/hang can never take down request handling.
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: absolutePath, format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }

  await resumeRepository.updateByStudent(studentId, {
    sourceData: { profileSnapshot, completedPrograms },
    aiPolishedContent: { ...aiContent, generatedAt: new Date() },
    pdfPath: path.join(relativeDir, fileName),
    status: 'ready',
    generatedAt: new Date(),
  });
}

export function startResumeWorker() {
  const worker = new Worker(
    QUEUE_NAMES.AI_RESUME,
    async (job) => generateResume(job.data.studentId),
    { connection: createRedisConnection(), concurrency: 2 },
  );

  worker.on('failed', async (job, err) => {
    logger.error({ err, jobId: job?.id }, 'resume-generate job failed');
    if (job?.data?.studentId) {
      await resumeRepository
        .updateByStudent(job.data.studentId, { status: 'failed' })
        .catch((updateErr) => logger.error({ err: updateErr }, 'Failed to mark resume as failed'));
    }
  });

  return worker;
}

export { generateResume };
