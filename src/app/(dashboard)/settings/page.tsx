import React from 'react';
import { redirect } from 'next/navigation';
import { Shield, Key, History, User } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect('/login');
  }

  // Fetch full details including manager name, department, and audit logs
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      department: {
        select: {
          name: true,
        }
      },
      manager: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        }
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      }
    }
  });

  if (!user) {
    redirect('/login');
  }

  const fullName = `${user.firstName} ${user.lastName}`;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'HR': return 'HR Manager';
      case 'MANAGER': return 'Manager';
      case 'EMPLOYEE': return 'Employee';
      default: return role;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Profile Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Review your employee identification cards, supervisor mapping, and security log history.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Column: User Profile Overview Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <CardBody style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 20px' }}>
              <Avatar name={fullName} size="lg" style={{ marginBottom: '16px' }} />
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{fullName}</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {user.designation || 'Specialist'}
              </p>
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                <Badge variant={user.role === 'SUPER_ADMIN' ? 'danger' : user.role === 'HR' ? 'info' : 'warning'}>
                  {getRoleLabel(user.role)}
                </Badge>
                <Badge variant="success">
                  {user.status}
                </Badge>
              </div>
            </CardBody>
          </Card>

          {/* Department and Manager Info Card */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={14} color="var(--accent-color)" />
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Job & Scope Details</h3>
              </div>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Employee ID</div>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{user.employeeId || 'Awaiting ID assignment'}</div>
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
              
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Department</div>
                <div style={{ fontWeight: 600 }}>{user.department?.name || 'Unassigned Department'}</div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Direct Manager</div>
                {user.manager ? (
                  <div>
                    <div style={{ fontWeight: 600 }}>{user.manager.firstName} {user.manager.lastName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.manager.email}</div>
                  </div>
                ) : (
                  <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {user.role === 'SUPER_ADMIN' ? 'System Administrator (Root)' : 'No Supervisor Assigned'}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Security Audits & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Personal Info Grid */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} color="var(--accent-color)" />
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Profile Account Information</h3>
              </div>
            </CardHeader>
            <CardBody style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '4px' }}>Email Address</label>
                <div style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  {user.email}
                </div>
              </div>

              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '4px' }}>Profile Created</label>
                <div style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  {new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Security Log Table */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={14} color="var(--accent-color)" />
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Recent Security Audit Logs</h3>
              </div>
              <Badge variant="info">Top 10 Actions</Badge>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {user.auditLogs.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No security history logs found for this user.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>
                          {log.action}
                        </TableCell>
                        <TableCell style={{ fontSize: '12px' }}>{log.details}</TableCell>
                        <TableCell style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>

      </div>
    </div>
  );
}
