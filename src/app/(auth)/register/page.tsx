'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Terminal, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast, ToastProvider } from '@/components/ui/Toast';

function RegisterForm() {
  const router = useRouter();
  const { success, error } = useToast();
  
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    departmentId: '',
    designation: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch departments list on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/admin/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartments(data.departments);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepartments();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleValidation = () => {
    const tempErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) tempErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) tempErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      tempErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      tempErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      tempErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleValidation()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        error('Registration Failed', data.error || 'Check fields and try again.');
        setLoading(false);
        return;
      }

      success('Success!', 'Registration complete. Awaiting HR approval.');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err) {
      console.error('Registration submit error:', err);
      error('System Error', 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-card" style={{ maxWidth: '480px' }}>
      <div className="auth-header">
        <div className="auth-logo">
          <Terminal size={24} />
          <span>WorkSphere</span>
        </div>
        <h2 className="auth-title">Create an account</h2>
        <p className="auth-subtitle">Join your company workspace today.</p>
      </div>

      {/* Safety Approval Disclaimer Banner */}
      <div style={{
        backgroundColor: 'var(--warning-bg)',
        color: 'var(--warning-color)',
        padding: '12px 14px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '12px',
        lineHeight: '1.4',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        textAlign: 'left'
      }}>
        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Access Approval Required:</strong> All new employee accounts are registered in a <strong>PENDING</strong> state. You will not have access to messages, tasks, or dashboard operations until your account is approved by HR.
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="First Name"
              name="firstName"
              placeholder="Jane"
              value={formData.firstName}
              onChange={handleInputChange}
              error={errors.firstName}
              disabled={loading}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="Last Name"
              name="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleInputChange}
              error={errors.lastName}
              disabled={loading}
              required
            />
          </div>
        </div>

        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="jane.doe@company.com"
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
          disabled={loading}
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="At least 6 characters"
          value={formData.password}
          onChange={handleInputChange}
          error={errors.password}
          disabled={loading}
          required
        />

        <div className="form-group">
          <label className="input-label">Select Requested Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="input-field"
            disabled={loading}
            style={{ appearance: 'none', cursor: 'pointer' }}
          >
            <option value="EMPLOYEE">Employee (Standard workspace access)</option>
            <option value="MANAGER">Manager (Manage projects & team tasks)</option>
            <option value="HR">HR Manager (Employee approvals & directories)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div className="form-group">
              <label className="input-label">Department</label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleInputChange}
                className="input-field"
                disabled={loading || loadingDepts}
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">-- No Department --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="Designation (Optional)"
              name="designation"
              placeholder="e.g. Developer"
              value={formData.designation}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          style={{ width: '100%', marginTop: '16px' }}
        >
          Register Account
        </Button>
      </form>

      <div className="auth-footer">
        Already have an account?{' '}
        <Link href="/login">Sign in here</Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="auth-container">
      <ToastProvider>
        <RegisterForm />
      </ToastProvider>
    </div>
  );
}
