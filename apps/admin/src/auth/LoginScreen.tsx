import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { authApi, useLoginMutation } from './authApi';
import { setMe } from './authSlice';
import { tokenStore } from './tokenStore';

import { useAppDispatch } from '@/app/store';
import { Button, Field, Input } from '@/components/ui';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export function LoginScreen() {
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const tokens = await login(values).unwrap();
      tokenStore.set(tokens);
      // Hydrate the session with roles/permissions/tenant scope from the server.
      const me = await dispatch(authApi.endpoints.me.initiate(undefined)).unwrap();
      dispatch(setMe(me));
    } catch {
      setError('Invalid email or password.');
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-content px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-panel p-8 shadow-card">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-gradient-to-br from-gold-bright to-gold-fill text-gold-ink">
            <Sparkles size={18} />
          </span>
          <div>
            <div className="text-[16px] font-extrabold tracking-tight text-text">CasinoOps</div>
            <div className="kicker">Admin Console</div>
          </div>
        </div>

        <h1 className="display mb-1 text-[22px] font-semibold text-text">Sign in</h1>
        <p className="mb-6 text-[13px] text-muted">Use your admin credentials to continue.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              placeholder="you@casino.com"
              autoComplete="username"
              {...register('email')}
            />
            {errors.email && <p className="mt-1 text-[12px] text-red">{errors.email.message}</p>}
          </Field>
          <Field label="Password">
            <Input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-[12px] text-red">{errors.password.message}</p>
            )}
          </Field>

          {error && (
            <div className="rounded-control border border-red bg-red-dim px-3 py-2 text-[12px] text-red">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-faint">
          Demo: super@demo.test · accountmgr@demo.test · marketer@demo.test — password{' '}
          <span className="font-mono">demo-pass</span>
        </p>
      </div>
    </div>
  );
}
