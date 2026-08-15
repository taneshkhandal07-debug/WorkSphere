'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, 
  Plus, 
  Calendar, 
  Users, 
  Building, 
  Activity, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast, ToastProvider } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import Avatar from '@/components/ui/Avatar';

interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  deadline: string | null;
  department: string | null;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  memberCount: number;
  members: Array<{ userId: string; name: string; role: string }>;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
}

function ProjectsBoard() {
  const router = useRouter();
  const { success, error } = useToast();
  
  // Data States
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('EMPLOYEE');

  // Modals & Action States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Form states
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStatus, setProjStatus] = useState('ACTIVE');
  const [projDeadline, setProjDeadline] = useState('');
  const [projDeptId, setProjDeptId] = useState('');

  // Fetch directory list of projects
  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Failed to retrieve project entries.');
    }
  };

  // Fetch departments and profile roles
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchProjects();
      
      try {
        const profileRes = await fetch('/api/auth/me');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setCurrentUserRole(profileData.user.role);
          
          if (profileData.user.role !== 'EMPLOYEE') {
            const deptsRes = await fetch('/api/admin/departments');
            if (deptsRes.ok) {
              const deptsData = await deptsRes.json();
              setDepartments(deptsData.departments);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) {
      error('Input Error', 'Project name is required.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projName,
          description: projDesc,
          status: projStatus,
          deadline: projDeadline || null,
          departmentId: projDeptId || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        success('Success', `Project "${projName}" has been created.`);
        setIsCreateOpen(false);
        // Clear forms
        setProjName('');
        setProjDesc('');
        setProjDeadline('');
        setProjDeptId('');
        // Reload listing
        fetchProjects();
      } else {
        error('Create Failed', data.error || 'Failed to create project.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Failed to write project record.');
    } finally {
      setCreateLoading(false);
    }
  };

  const isManagement = currentUserRole === 'HR' || currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'MANAGER';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNING': return <Badge variant="info">Planning</Badge>;
      case 'ACTIVE': return <Badge variant="info">Active</Badge>;
      case 'ON_HOLD': return <Badge variant="warning">On Hold</Badge>;
      case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
      case 'CANCELLED': return <Badge variant="danger">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner size={32} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Projects</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Coordinate project schedules, workload analytics, and milestone progress.
          </p>
        </div>
        {isManagement && (
          <Button variant="primary" onClick={() => setIsCreateOpen(true)} style={{ gap: '6px' }}>
            <Plus size={14} />
            <span>Create Project</span>
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <Card style={{ padding: '60px' }}>
          <EmptyState
            icon={Briefcase}
            title="No Active Projects"
            description="You are not a member of any projects yet. Ask a project manager to add you to their workspace!"
          />
        </Card>
      ) : (
        /* Projects Cards Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {projects.map((proj) => (
            <div 
              key={proj.id} 
              onClick={() => router.push(`/projects/${proj.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <Card 
                style={{ transition: 'transform 0.2s', position: 'relative' }}
                className="hover:scale-up"
              >
                <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
                  {/* Status and Department badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {getStatusBadge(proj.status)}
                    {proj.department && (
                      <Badge variant="info">
                        <Building size={10} style={{ marginRight: '4px' }} />
                        {proj.department}
                      </Badge>
                    )}
                  </div>

                  {/* Project Title & description */}
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {proj.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '34px', lineHeight: 1.4 }}>
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Completion progress</span>
                      <span>{proj.progress}% ({proj.completedTasks}/{proj.totalTasks} Tasks)</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${proj.progress}%`, height: '100%', backgroundColor: 'var(--accent-color)', borderRadius: '3px' }} />
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                  {/* Footer Details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} />
                      <span>{proj.memberCount} members</span>
                    </div>
                    
                    {proj.deadline ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>Due: {new Date(proj.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    ) : (
                      <span>No deadline</span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Initialize New Project"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateProject} loading={createLoading}>
              Create Project
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Project Title"
            value={projName}
            onChange={(e) => setProjName(e.target.value)}
            placeholder="e.g. Q3 Roadmap Expansion"
            required
            disabled={createLoading}
          />

          <div className="form-group">
            <label className="input-label">Project Description</label>
            <textarea
              value={projDesc}
              onChange={(e) => setProjDesc(e.target.value)}
              className="input-field"
              placeholder="Detail the scope and targets for this project..."
              style={{ minHeight: '80px', fontSize: '13px' }}
              disabled={createLoading}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }} className="form-group">
              <label className="input-label">Initial Status</label>
              <select
                value={projStatus}
                onChange={(e) => setProjStatus(e.target.value)}
                className="input-field"
                disabled={createLoading}
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>

            <div style={{ flex: 1 }} className="form-group">
              <label className="input-label">Department Alignment</label>
              <select
                value={projDeptId}
                onChange={(e) => setProjDeptId(e.target.value)}
                className="input-field"
                disabled={createLoading}
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">-- No Department --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ width: '50%' }}>
            <Input
              label="Target Deadline"
              type="date"
              value={projDeadline}
              onChange={(e) => setProjDeadline(e.target.value)}
              disabled={createLoading}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <ToastProvider>
      <ProjectsBoard />
    </ToastProvider>
  );
}
