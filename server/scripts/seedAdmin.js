/* eslint-disable no-console -- CLI script; console output is the actual deliverable here */
// Creates (or updates) a single admin account without touching any other
// data — unlike scripts/seed.js, which wipes the database, this is safe to
// run against a real deployment to bootstrap the first admin.
//
// Credentials come from environment variables, never CLI arguments, so the
// password doesn't end up in shell history or the process list:
//
//   ADMIN_EMAIL=you@college.edu ADMIN_PASSWORD='a long passphrase' npm run seed:admin
//
// Flags:
//   --reset-password  the admin already exists: set the new password and
//                     sign out every existing session for that account
//   --promote         the email belongs to a student: make them an admin
//
// Without a flag, an existing account is left exactly as it is.
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/utils/hashUtils.js';

const WEAK_PASSWORDS = new Set(['password123!', 'admin123!', 'administrator', 'changeme123!']);

const credentialsSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('ADMIN_EMAIL must be a valid email address'),
    password: z
      .string()
      .min(12, 'ADMIN_PASSWORD must be at least 12 characters')
      .max(128, 'ADMIN_PASSWORD must be at most 128 characters'),
  })
  .superRefine(({ email, password }, ctx) => {
    const lowered = password.toLowerCase();
    const localPart = email.split('@')[0];
    if (WEAK_PASSWORDS.has(lowered) || (localPart.length >= 4 && lowered.includes(localPart))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'ADMIN_PASSWORD is too easy to guess — choose a longer, unrelated passphrase',
      });
    }
  });

export function parseCredentials({ email, password }) {
  const parsed = credentialsSchema.safeParse({ email: email ?? '', password: password ?? '' });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join('\n'));
  }
  return parsed.data;
}

// Returns what happened: 'created' | 'password-reset' | 'promoted' | 'unchanged'.
export async function ensureAdmin({ email, password, resetPassword = false, promote = false }) {
  const credentials = parseCredentials({ email, password });
  const existing = await User.findOne({ email: credentials.email });

  if (!existing) {
    await User.create({
      email: credentials.email,
      passwordHash: await hashPassword(credentials.password),
      role: 'admin',
      onboardingCompleted: true, // admins never go through student onboarding
    });
    return 'created';
  }

  if (existing.role !== 'admin') {
    if (!promote) {
      throw new Error(
        `${credentials.email} is a student account. Re-run with --promote to make it an admin.`,
      );
    }
    existing.role = 'admin';
    existing.status = 'active';
    existing.onboardingCompleted = true;
    await existing.save();
    if (!resetPassword) return 'promoted';
  }

  if (resetPassword) {
    await User.updateOne(
      { _id: existing._id },
      {
        $set: { passwordHash: await hashPassword(credentials.password), status: 'active', refreshTokenHash: null },
        $inc: { refreshTokenVersion: 1 }, // invalidates every refresh token issued before the reset
      },
    );
    return 'password-reset';
  }

  return 'unchanged';
}

const MESSAGES = {
  created: 'Admin account created.',
  'password-reset': 'Admin password reset. All existing sessions for this account were signed out.',
  promoted: 'Account promoted to admin.',
  unchanged:
    'An admin with this email already exists — nothing changed. Use --reset-password to set a new password.',
};

async function main() {
  // Imported lazily so the exported helpers above can be tested without a
  // full .env (env.js validates every variable at import time).
  const { connectDb, disconnectDb } = await import('../src/config/db.js');
  const args = new Set(process.argv.slice(2));
  const unknown = [...args].filter((arg) => !['--reset-password', '--promote'].includes(arg));
  if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(', ')}`);

  await connectDb();
  try {
    const result = await ensureAdmin({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      resetPassword: args.has('--reset-password'),
      promote: args.has('--promote'),
    });
    console.log(`${MESSAGES[result]} (${process.env.ADMIN_EMAIL.trim().toLowerCase()})`);
  } finally {
    await disconnectDb();
  }
}

const isMainModule = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isMainModule) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`Admin seeding failed: ${err.message}`);
      process.exit(1);
    });
}
