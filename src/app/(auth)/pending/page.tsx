'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast, ToastProvider } from '@/components/ui/Toast';

function PendingScreen() {
  const router = useRouter();
  const { info, success, error } = useToast();
  const [checking, setChecking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          if (data.user.status === 'ACTIVE') {
            success('Account Approved!', 'Welcome to WorkSphere.');
            router.push('/dashboard');
            router.refresh();
            return;
          } else if (data.user.status === 'REJECTED') {
            error('Account Rejected', 'Your registration request was declined.');
            return;
          }
        }
      }
      info('Status Check', 'Your registration is still under HR/Admin review.');
    } catch (err) {
      console.error('Check status error:', err);
      error('System Error', 'Failed to retrieve account status.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.refresh();
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
      error('System Error', 'Failed to sign out.');
      setSigningOut(false);
    }
  };

  return (
    <div className="auth-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
      <div className="auth-header" style={{ alignItems: 'center' }}>
        <div className="auth-logo">
          <Terminal size={24} />
          <span>WorkSphere</span>
        </div>
        
        <div style={{
          backgroundColor: 'var(--warning-bg)',
          color: 'var(--warning-color)',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '16px 0 8px 0'
        }}>
          <ShieldAlert size={28} />
        </div>
        
        <h2 className="auth-title">Awaiting Approval</h2>
        <p className="auth-subtitle" style={{ fontSize: '13px', marginTop: '6px' }}>
          Registration received. For security reasons, your account is currently pending review and must be approved by HR or an Admin before accessing the workspace.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
        <Button
          variant="primary"
          onClick={handleCheckStatus}
          loading={checking}
          style={{ width: '100%', gap: '8px' }}
        >
          {!checking && <RefreshCw size={14} />}
          <span>Check Approval Status</span>
        </Button>

        <Button
          variant="outline"
          onClick={handleLogout}
          loading={signingOut}
          style={{ width: '100%', gap: '8px' }}
        >
          {!signingOut && <LogOut size={14} />}
          <span>Sign Out</span>
        </Button>
      </div>

      <div className="auth-footer" style={{ fontSize: '11px', marginTop: '12px' }}>
        Branding code: WS-AUTH-PENDING
      </div>
    </div>
  );
}

export default function PendingPage() {
  return (
    <div className="auth-container">
      <ToastProvider>
        <PendingScreen />
      </ToastProvider>
    </div>
  );
}
