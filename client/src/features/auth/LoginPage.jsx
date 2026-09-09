import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useLoginMutation } from './authApi.js';
import { credentialsSet } from './authSlice.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { InlineError } from '../../components/ui/Feedback.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await login({ email, password });
    if (result.error) return;
    dispatch(credentialsSet(result.data));
    const { user } = result.data;
    if (user.role === 'admin') navigate('/admin');
    else navigate(user.onboardingCompleted ? '/dashboard' : '/onboarding');
  }

  const message =
    error?.status === 429
      ? 'Too many login attempts. Wait a few minutes before trying again.'
      : error
        ? 'That email and password combination did not match an account.'
        : null;

  return (
    <div>
      <h1 className="font-display text-[26px] font-semibold leading-tight">Log in</h1>
      <p className="mt-1.5 text-sm text-muted">Pick up your preparation where you left off.</p>

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

        <Field label="Password">
          {(a) => (
            <Input
              {...a}
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Field>

        <InlineError>{message}</InlineError>

        <Button type="submit" size="lg" disabled={isLoading} className="mt-1 w-full">
          {isLoading ? 'Logging in' : 'Log in'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New here?{' '}
        <Link to="/register" className="font-medium text-brand underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </div>
  );
}
