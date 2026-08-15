'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Terminal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast, ToastProvider } from '@/components/ui/Toast';

function LoginForm() {
  const router = useRouter();
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleValidation = () => {
    const tempErrors: { email?: string; password?: string } = {};
    if (!email) {
      tempErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      tempErrors.password = 'Password is required';
    }
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleValidation()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        error('Login Failed', data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      success('Welcome Back!', 'Login successful.');
      
      // Check account status and redirect accordingly
      if (data.user.status === 'PENDING') {
        router.push('/pending');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err) {
      console.error('Login submit error:', err);
      error('System Error', 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo">
          <Terminal size={24} />
          <span>WorkSphere</span>
        </div>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">One Workspace. Every Workflow.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={loading}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={loading}
          required
        />

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          style={{ width: '100%', marginTop: '16px' }}
        >
          Sign In
        </Button>
      </form>

      <div className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link href="/register">Register here</Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-container">
      <ToastProvider>
        <LoginForm />
      </ToastProvider>
    </div>
  );
}
