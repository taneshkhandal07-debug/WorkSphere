'use client';

import React, { useEffect, useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  Calendar, 
  Users, 
  Building, 
  Activity, 
  TrendingUp,
  AlertCircle,
  Clock,
  PlusCircle,
  Eye,
  Trash2,
  ListTodo,
  Columns
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tabs } from '../ui/Tabs';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useToast, ToastProvider } from '../ui/Toast';
import { LoadingSpinner } from '../ui/Loading';
import { EmptyState } from '../ui/EmptyState';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import Avatar from '../ui/Avatar';
import { TaskDetailsPanel } from '../tasks/TaskDetailsPanel';

interface ProjectDetailClientProps {
  projectId: string;
}

interface ProjectMember {
  userId: string;
  role: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string | null;
    designation: string | null;
  };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: { id: string; firstName: string; lastName: string; email: string } | null;
  creator: { firstName: string; lastName: string };
  subtasks: Array<{ id: string; isCompleted: boolean }>;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  deadline: string | null;
  department: { name: string } | null;
  members: ProjectMember[];
  tasks: Task[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    overdueTasks: number;
    progress: number;
    workload: Array<{ name: string; total: number; completed: number }>;
  };
}

const statusColumns = [
  { id: 'BACKLOG', label: 'Backlog', color: 'var(--text-muted)' },
  { id: 'TODO', label: 'To Do', color: 'var(--accent-color)' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'var(--warning-color)' },
  { id: 'REVIEW', label: 'Review', color: 'var(--info-color)' },
  { id: 'DONE', label: 'Done', color: 'var(--success-color)' },
];

export const ProjectDetailClient: React.FC<ProjectDetailClientProps> = ({ projectId }) => {
  const { success, error, info } = useToast();
  
  // Data States
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterUsers, setRosterUsers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  
  // Tab Navigation State
  const [activeTab, setActiveTab] = useState('overview');
  
  // Slide-out Drawer Panel state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modals & action states
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Task Creation Form States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Member Form State
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      } else {
        error('Data Error', 'Failed to retrieve project scope.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Project details request timed out.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoster = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setRosterUsers(data.users.map((u: any) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchRoster();
  }, [projectId]);

  // Task Creation submit
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      error('Input Error', 'Task title is required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          projectId,
          assigneeId: taskAssigneeId || null,
          priority: taskPriority,
          dueDate: taskDueDate || null,
          status: 'TODO'
        })
      });

      const data = await res.json();
      if (res.ok) {
        success('Success', `Task "${taskTitle}" allocated.`);
        setIsCreateTaskOpen(false);
        // Clear forms
        setTaskTitle('');
        setTaskDesc('');
        setTaskAssigneeId('');
        setTaskDueDate('');
        // Reload project
        fetchProject();
      } else {
        error('Allocation Failed', data.error || 'Failed to create task.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Failed to write task record.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Member submit
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberId) {
      error('Input Error', 'Please select an employee.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          userId: newMemberId,
          role: newMemberRole
        })
      });

      const data = await res.json();
      if (res.ok) {
        success('Member Added', 'Employee successfully synchronized to project workspace.');
        setIsAddMemberOpen(false);
        setNewMemberId('');
        fetchProject();
      } else {
        error('Action Failed', data.error || 'Failed to add member.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Network failure.');
    } finally {
      setActionLoading(false);
    }
  };

  // HTML5 Kanban Drag-and-Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Optimistic Update
    setProject(prev => {
      if (!prev) return null;
      const updatedTasks = prev.tasks.map(t => 
        t.id === taskId ? { ...t, status } : t
      );
      
      // Recalculate quick stats progress
      const completedCount = updatedTasks.filter(t => t.status === 'DONE').length;
      const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0;
      
      return {
        ...prev,
        tasks: updatedTasks,
        stats: { ...prev.stats, progress }
      };
    });

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        success('Task Updated', 'Kanban task status synchronized.');
        fetchProject(); // Reload to refresh backend workloads
      } else {
        error('Sync Failed', 'Could not save task status. Reverting changes.');
        fetchProject();
      }
    } catch (err) {
      console.error(err);
      fetchProject();
    }
  };

  const handleTaskCardClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDrawerOpen(true);
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'URGENT': return <Badge variant="danger">Urgent</Badge>;
      case 'HIGH': return <Badge variant="danger">High</Badge>;
      case 'MEDIUM': return <Badge variant="warning">Medium</Badge>;
      case 'LOW': return <Badge variant="info">Low</Badge>;
      default: return <Badge>{prio}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNING': return <Badge variant="info">Planning</Badge>;
      case 'ACTIVE': return <Badge variant="info">Active</Badge>;
      case 'ON_HOLD': return <Badge variant="warning">On Hold</Badge>;
      case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner size={32} />;
  }

  if (!project) {
    return (
      <Card style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          icon={Briefcase}
          title="Project Not Found"
          description="The requested project could not be found or you do not have permissions to view it."
          actionLabel="Return to Projects"
          onAction={() => window.location.href = '/projects'}
        />
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Project Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            <span>PROJECTS</span>
            <span>/</span>
            <span>{project.department?.name || 'GLOBAL'}</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {project.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
            {project.description || 'No project description.'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {getStatusBadge(project.status)}
          <Button variant="outline" size="sm" onClick={() => setIsCreateTaskOpen(true)} style={{ gap: '6px' }}>
            <PlusCircle size={14} />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview Analytics' },
          { id: 'tasks-list', label: 'Tasks List' },
          { id: 'kanban-board', label: 'Kanban Board' },
          { id: 'members', label: `Members (${project.members.length})` },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id)}
      />

      {/* TAB 1: OVERVIEW ANALYTICS */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <Card>
              <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Progress</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-color)' }}>
                  {project.stats.progress}%
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Tasks</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{project.stats.totalTasks}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Completed Tasks</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--success-color)' }}>
                  {project.stats.completedTasks}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Active Tasks</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--warning-color)' }}>
                  {project.stats.activeTasks}
                </div>
              </CardBody>
            </Card>
            {project.stats.overdueTasks > 0 && (
              <Card style={{ borderColor: 'var(--error-color)', backgroundColor: 'var(--error-bg)' }}>
                <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--error-color)', fontWeight: 600 }}>Overdue Tasks</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--error-color)' }}>
                    {project.stats.overdueTasks}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px', alignItems: 'flex-start' }}>
            
            {/* Workload chart */}
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={14} color="var(--accent-color)" />
                  <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Team Workload Distribution</h3>
                </div>
              </CardHeader>
              <CardBody style={{ height: '260px' }}>
                {project.stats.workload.length === 0 ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No tasks assigned to members yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={project.stats.workload} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-primary)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px'
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="total" fill="var(--border-color)" name="Total Assigned" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="completed" fill="var(--success-color)" name="Completed Tasks" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            {/* Project Milestones overview */}
            <Card>
              <CardHeader>
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Milestone & Scope</h3>
              </CardHeader>
              <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Project Deadline</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>
                    {project.deadline 
                      ? new Date(project.deadline).toLocaleDateString(undefined, { dateStyle: 'long' }) 
                      : 'No target deadline assigned.'
                    }
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Department Head</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>
                    {project.members.find(m => m.role === 'OWNER')?.user.firstName || 'Root Admin'}
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '6px' }}>Project Members List</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {project.members.map(m => {
                      const name = `${m.user.firstName} ${m.user.lastName}`;
                      return (
                        <Badge key={m.userId} variant={m.role === 'OWNER' ? 'warning' : 'info'}>
                          <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <Avatar name={name} size="sm" />
                            <span>{name} ({m.user.designation || 'Staff'})</span>
                          </span>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardBody>
            </Card>

          </div>
        </div>
      )}

      {/* TAB 2: TASKS LIST TABLE */}
      {activeTab === 'tasks-list' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListTodo size={16} color="var(--accent-color)" />
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Project Tasks</h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsCreateTaskOpen(true)}>
              Allocate Task
            </Button>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {project.tasks.length === 0 ? (
              <div style={{ padding: '40px' }}>
                <EmptyState
                  icon={ListTodo}
                  title="No Tasks Assigned"
                  description="There are currently no tasks allocated under this project. Click Allocate Task to start work."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Checklist</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.tasks.map((task) => (
                    <TableRow key={task.id} onClick={() => handleTaskCardClick(task.id)}>
                      <TableCell style={{ fontFamily: 'monospace', fontWeight: 500, color: 'var(--text-muted)' }}>
                        TAS-{task.id.slice(0, 4).toUpperCase()}
                      </TableCell>
                      <TableCell style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {task.title}
                      </TableCell>
                      <TableCell>
                        {task.assignee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Avatar name={`${task.assignee.firstName} ${task.assignee.lastName}`} size="sm" />
                            <span>{task.assignee.firstName} {task.assignee.lastName}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          task.status === 'DONE' ? 'success' : 
                          task.status === 'IN_PROGRESS' ? 'warning' : 
                          task.status === 'REVIEW' ? 'info' : undefined
                        }>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {task.subtasks.length > 0 
                          ? `${task.subtasks.filter(s => s.isCompleted).length}/${task.subtasks.length} Checklists`
                          : 'No checklists'
                        }
                      </TableCell>
                      <TableCell>
                        {task.dueDate 
                          ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : '--'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      {/* TAB 3: KANBAN BOARD */}
      {activeTab === 'kanban-board' && (
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', minHeight: '500px', paddingBottom: '16px' }}>
          {statusColumns.map((col) => {
            const columnTasks = project.tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                style={{
                  flex: '1',
                  minWidth: '220px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Column Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }} />
                    <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>{col.label}</span>
                  </div>
                  <Badge variant="info">{columnTasks.length}</Badge>
                </div>

                {/* Cards List container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1, minHeight: '380px' }}>
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => handleTaskCardClick(task.id)}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        cursor: 'grab',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.15s'
                      }}
                      className="hover:shadow-md"
                    >
                      <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {task.title}
                      </h4>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                        {getPriorityBadge(task.priority)}
                        {task.assignee ? (
                          <Avatar name={`${task.assignee.firstName} ${task.assignee.lastName}`} size="sm" />
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: MEMBERS MANAGEMENT */}
      {activeTab === 'members' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="var(--accent-color)" />
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Project Workspace Team</h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(true)} style={{ gap: '4px' }}>
              <PlusCircle size={14} />
              <span>Add Member</span>
            </Button>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Scope Role</TableHead>
                  <TableHead>Email Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.members.map((member) => {
                  const name = `${member.user.firstName} ${member.user.lastName}`;
                  return (
                    <TableRow key={member.userId}>
                      <TableCell style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar name={name} size="sm" />
                        <span>{name}</span>
                      </TableCell>
                      <TableCell>{member.user.designation || 'Staff specialist'}</TableCell>
                      <TableCell>
                        <Badge variant={member.role === 'OWNER' ? 'warning' : 'info'}>
                          {member.role === 'OWNER' ? 'Project Owner' : 'Project Member'}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.user.email}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* CREATE TASK ALLOCATION MODAL */}
      <Modal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        title="Allocate New Task"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsCreateTaskOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateTask} loading={actionLoading}>
              Allocate Task
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Task Summary / Title"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="e.g. Implement bcrypt password salting"
            required
            disabled={actionLoading}
          />

          <div className="form-group">
            <label className="input-label">Task Description</label>
            <textarea
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="input-field"
              placeholder="Detail the tasks targets and requirements..."
              style={{ minHeight: '80px', fontSize: '13px' }}
              disabled={actionLoading}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }} className="form-group">
              <label className="input-label">Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="input-field"
                disabled={actionLoading}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div style={{ flex: 1 }} className="form-group">
              <label className="input-label">Assignee</label>
              <select
                value={taskAssigneeId}
                onChange={(e) => setTaskAssigneeId(e.target.value)}
                className="input-field"
                disabled={actionLoading}
              >
                <option value="">-- Unassigned --</option>
                {project.members.map(m => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.firstName} {m.user.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ width: '50%' }}>
            <Input
              label="Due Date"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              disabled={actionLoading}
            />
          </div>
        </form>
      </Modal>

      {/* ADD MEMBER MODAL */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Add Workspace Team Member"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddMember} loading={actionLoading}>
              Add to Project
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="input-label">Select Employee</label>
            <select
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              className="input-field"
              disabled={actionLoading}
            >
              <option value="">-- Select Coworker --</option>
              {rosterUsers
                // Filter out users who are already project members
                .filter(u => !project.members.some(pm => pm.userId === u.id))
                .map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))
              }
            </select>
          </div>

          <div className="form-group">
            <label className="input-label">Scope Access Role</label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="input-field"
              disabled={actionLoading}
            >
              <option value="MEMBER">Project Member (Allocate/Edit tasks)</option>
              <option value="OWNER">Project Owner (Manage members/scopes)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* TASK DETAILS SLIDE-OUT PANEL */}
      <TaskDetailsPanel
        taskId={selectedTaskId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdated={fetchProject}
      />

    </div>
  );
};
export default ProjectDetailClient;
