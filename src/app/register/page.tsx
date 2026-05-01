'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Music2, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
      } else {
        router.push('/upload');
        router.refresh();
      }
    } catch {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-spotify-bg px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-spotify-green/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-spotify-green/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-spotify-green rounded-full flex items-center justify-center mb-4 glow-green">
            <Music2 className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold">Create account</h1>
          <p className="text-spotify-gray mt-2">Start exploring your music story</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-spotify-card rounded-2xl p-8 space-y-5 border border-white/5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {[
            { label: 'Username', field: 'username', type: 'text', placeholder: 'musiclover' },
            { label: 'Email', field: 'email', type: 'email', placeholder: 'you@example.com' },
            { label: 'Password', field: 'password', type: 'password', placeholder: '••••••••' },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-spotify-gray mb-2">{label}</label>
              <input
                type={type}
                value={form[field as keyof typeof form]}
                onChange={(e) => update(field, e.target.value)}
                required
                minLength={field === 'password' ? 6 : 2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-spotify-green transition-colors"
                placeholder={placeholder}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-spotify-green hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-full transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <p className="text-center text-spotify-gray text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-spotify-green hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
