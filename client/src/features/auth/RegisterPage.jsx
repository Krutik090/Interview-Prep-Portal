import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useRegisterMutation } from './authApi.js';
import { credentialsSet } from './authSlice.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { InlineError } from '../../components/ui/Feedback.jsx';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, { isLoading, error }] = useRegisterMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const tooShort = password.length > 0 && password.length < 8;

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await register({ email, password });
    if (result.error) return;
    dispatch(credentialsSet(result.data));
    navigate('/onboarding');
  }

  const message =
    error?.status === 409
      ? 'An account already exists with that email. Log in instead.'
      : error?.status === 429
        ? 'Too many attempts. Wait a few minutes before trying again.'
        : error
          ? 'Could not create the account. Check your details and try again.'
          : null;

  return (
    <div>
      <h1 className="font-display text-[26px] font-semibold leading-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted">
        Answer a few questions next, and we&apos;ll suggest where to start.
      </p>

      <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Email">
          {(a) => (
            <Input
              {...a}
              type="email"
              autoComplete="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </Field>

        <Field
          label="Password"
          hint="At least 8 characters."
          error={tooShort ? 'Use at least 8 characters.' : undefined}
        >
          {(a) => (
            <Input
              {...a}
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              minLength={8}
              invalid={tooShort}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Field>

        <InlineError>{message}</InlineError>

        <Button type="submit" size="lg" disabled={isLoading || tooShort} className="mt-1 w-full">
          {isLoading ? 'Creating account' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand underline underline-offset-2">
          Log in
        </Link>
      </p>
    </div>
  );
}
