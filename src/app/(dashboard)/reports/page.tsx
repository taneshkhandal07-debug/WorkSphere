'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Building, 
  Briefcase, 
  CheckSquare, 
  AlertCircle, 
  Activity, 
  ShieldAlert, 
  Calendar, 
  Settings, 
  Plus, 
  Check, 
  X, 
  Search, 
  FolderPlus, 
  UserCheck, 
  TrendingUp,
  Sliders
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast, ToastProvider } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import Avatar from '@/components/ui/Avatar';

// Roster Interfaces
interface UserRosterItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  designation: string | null;
  role: string;
  status: string;
  departmentId: string | null;
  managerId: string | null;
  department: { name: string } | null;
  manager: { firstName: string; lastName: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  department: { name: string };
  members: Array<{ userId: string; user: { firstName: string; lastName: string } }>;
}

interface AuditLogItem {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
}

interface AttendanceLogItem {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  workingMinutes: number | null;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
}

function AdministrationPanel() {
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Dashboard & Charts data
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);

  // Lists state
  const [users, setUsers] = useState<UserRosterItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState('overview');

  // Search/Filter states
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  
  // Attendance filters
  const [attDate, setAttDate] = useState('');
  const [attDept, setAttDept] = useState('');

  // Modals & Action loadings
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit User Form State
  const [selectedUser, setSelectedUser] = useState<UserRosterItem | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');

  // Create Department Form State
  const [newDeptName, setNewDeptName] = useState('');

  // Create Team Form State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamDeptId, setNewTeamDeptId] = useState('');
  const [selectedTeamUsers, setSelectedTeamUsers] = useState<string[]>([]);

  // Load stats, charts, users, depts, teams, attendance
  const loadAdminMetrics = async () => {
    try {
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
        setCharts(statsData.charts);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    try {
      // 1. Get Me
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
        
        if (meData.user.role === 'EMPLOYEE') {
          setLoading(false);
          return; // Skip rest of loading for employees
        }
      }

      await loadAdminMetrics();

      // 2. Fetch Roster Users
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      // 3. Fetch Departments
      const deptsRes = await fetch('/api/admin/departments');
      if (deptsRes.ok) {
        const deptsData = await deptsRes.json();
        setDepartments(deptsData.departments);
      }

      // 4. Fetch Teams
      const teamsRes = await fetch('/api/admin/teams');
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.teams);
      }

      // 5. Fetch Attendance logs
      const attRes = await fetch('/api/admin/attendance');
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendanceLogs(attData.logs);
      }

      // 6. Fetch Audit logs (Admins only)
      const auditRes = await fetch('/api/admin/audit-logs');
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync Attendance filter search
  const handleAttendanceSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance?date=${attDate}&departmentId=${attDept}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sync Audit log search query
  const handleAuditLogSearch = async () => {
    try {
      const res = await fetch(`/api/admin/audit-logs?query=${auditSearch}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger quick approve or reject actions for pending users
  const handleQuickStatusAction = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(true);
    try {
      // Approve requires assigning an EmployeeID - generate default unique code
      const defaultEmployeeId = action === 'approve' ? `EMP-${Date.now().toString().slice(-4)}` : '';
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          employeeId: defaultEmployeeId
        })
      });

      const data = await res.json();
      if (res.ok) {
        success('User status updated', `Successfully performed status change.`);
        loadData();
      } else {
        error('Action Failed', data.error || 'Failed to update user registration.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit User modal
  const openEditUserModal = (u: UserRosterItem) => {
    setSelectedUser(u);
    setEditStatus(u.status);
    setEditRole(u.role);
    setEditDeptId(u.departmentId || '');
    setEditDesignation(u.designation || '');
    setEditManagerId(u.managerId || '');
    setEditEmployeeId(u.employeeId || '');
    setIsEditUserOpen(true);
  };

  // Submit edit user profile adjustments
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editStatus === 'ACTIVE' && selectedUser.status === 'PENDING' ? 'approve' : 'update',
          status: editStatus,
          role: editRole,
          departmentId: editDeptId || null,
          designation: editDesignation || null,
          managerId: editManagerId || null,
          employeeId: editEmployeeId || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        success('Success', `Employee roster updated.`);
        setIsEditUserOpen(false);
        loadData();
      } else {
        error('Update Failed', data.error || 'Failed to update details.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit create Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName })
      });

      const data = await res.json();
      if (res.ok) {
        success('Success', `Department "${newDeptName}" created.`);
        setNewDeptName('');
        setIsCreateDeptOpen(false);
        loadData();
      } else {
        error('Create failed', data.error || 'Failed to create department.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit create Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamDeptId) {
      error('Input Error', 'Please complete the team name and choose a department.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDesc,
          departmentId: newTeamDeptId,
          userIds: selectedTeamUsers
        })
      });

      const data = await res.json();
      if (res.ok) {
        success('Success', `Team "${newTeamName}" created.`);
        setNewTeamName('');
        setNewTeamDesc('');
        setNewTeamDeptId('');
        setSelectedTeamUsers([]);
        setIsCreateTeamOpen(false);
        loadData();
      } else {
        error('Create failed', data.error || 'Failed to build team.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleTeamMemberSelection = (id: string) => {
    setSelectedTeamUsers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  if (loading) {
    return <LoadingSpinner size={32} />;
  }

  // Employee guard: prevent access
  if (currentUser?.role === 'EMPLOYEE') {
    return (
      <Card style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          icon={ShieldAlert}
          title="Access Forbidden"
          description="The workforce administration panel is restricted. Standard employees do not have authorization to view logs."
          actionLabel="Return to Workspace"
          onAction={() => window.location.href = '/dashboard'}
        />
      </Card>
    );
  }

  const isHrOrAdmin = currentUser?.role === 'HR' || currentUser?.role === 'SUPER_ADMIN';

  // Filters Roster employees matching search input
  const filteredUsers = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase()) || 
                          (u.employeeId && u.employeeId.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Admin Control Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Check workforce metrics, manage employee profiles, allocate teams, and review security logs.
          </p>
        </div>
      </div>

      {/* Privileged workspace navigation tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Dashboard Stats' },
          { id: 'analytics', label: 'Workforce Analytics' },
          { id: 'employees', label: `Employees (${users.length})` },
          { id: 'depts-teams', label: 'Departments & Teams' },
          { id: 'attendance', label: 'Attendance Feed' },
          ...(isHrOrAdmin ? [{ id: 'audit-logs', label: 'Audit Logs' }] : []),
          { id: 'permissions', label: 'Permissions Grid' },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id)}
      />

      {/* TAB 1: OVERVIEW METRIC SNAPSHOT */}
      {activeTab === 'overview' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPI Count cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <Card>
              <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Active Employees</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--success-color)' }}>
                  {stats.activeEmployees} / {stats.totalEmployees}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Online Staff (Today)</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-color)' }}>
                  {stats.onlineUsers}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Pending Approvals</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: stats.pendingAccounts > 0 ? 'var(--warning-color)' : 'var(--text-primary)' }}>
                  {stats.pendingAccounts}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Projects Status</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>
                  {stats.activeProjects} Active
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Overdue Tasks</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: stats.overdueTasks > 0 ? 'var(--error-color)' : 'var(--text-primary)' }}>
                  {stats.overdueTasks}
                </div>
              </CardBody>
            </Card>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Quick summaries */}
            <Card>
              <CardHeader>
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Approvals Queue</h3>
              </CardHeader>
              <CardBody>
                {users.filter(u => u.status === 'PENDING').length === 0 ? (
                  <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                    No pending registration approvals in queue.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {users.filter(u => u.status === 'PENDING').map(u => (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{u.firstName} {u.lastName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                        {isHrOrAdmin ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Button size="sm" variant="primary" onClick={() => handleQuickStatusAction(u.id, 'approve')} disabled={actionLoading}>
                              Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleQuickStatusAction(u.id, 'reject')} disabled={actionLoading}>
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pending HR</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Active Projects completion</h3>
              </CardHeader>
              <CardBody style={{ height: '240px' }}>
                {!charts?.projectCompletion || charts.projectCompletion.length === 0 ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No projects active.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.projectCompletion} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={10} />
                      <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} width={80} />
                      <Tooltip />
                      <Bar dataKey="progress" fill="var(--accent-color)" name="Completion %" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

          </div>
        </div>
      )}

      {/* TAB 2: RECHARTS WORKFORCE ANALYTICS */}
      {activeTab === 'analytics' && charts && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Attendance trends */}
          <Card>
            <CardHeader>
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Daily Attendance Trends</h3>
            </CardHeader>
            <CardBody style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.attendanceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Attendees" stroke="var(--success-color)" fill="var(--success-bg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Department distribution */}
          <Card>
            <CardHeader>
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Department Roster Distribution</h3>
            </CardHeader>
            <CardBody style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.deptDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--accent-color)" name="Employees Count" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Task Status */}
          <Card>
            <CardHeader>
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Task Status Distribution</h3>
            </CardHeader>
            <CardBody style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.taskStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--warning-color)" name="Tasks Count" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Employee workload */}
          <Card>
            <CardHeader>
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Active Workloads (Tasks Assigned)</h3>
            </CardHeader>
            <CardBody style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.employeeWorkload} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="var(--info-color)" name="Active Tasks" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

        </div>
      )}

      {/* TAB 3: EMPLOYEES ROSTER MANAGER */}
      {activeTab === 'employees' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="var(--accent-color)" />
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Roster Registry</h3>
            </div>
            <div className="relative" style={{ width: '220px', margin: 0 }}>
              <Search className="header-search-icon" size={13} style={{ left: '10px' }} />
              <input 
                type="text" 
                placeholder="Search by name, ID..." 
                className="header-search-input"
                style={{ paddingLeft: '32px', fontSize: '12px', height: '32px' }}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  {isHrOrAdmin && <TableHead style={{ textAlign: 'right' }}>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const name = `${u.firstName} ${u.lastName}`;
                  return (
                    <TableRow key={u.id}>
                      <TableCell style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar name={name} size="sm" />
                        <div>
                          <div>{name}</div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell style={{ fontFamily: 'monospace' }}>{u.employeeId || '--'}</TableCell>
                      <TableCell>{u.department?.name || 'GLOBAL'}</TableCell>
                      <TableCell>{u.designation || 'Staff specialist'}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'SUPER_ADMIN' ? 'danger' : u.role === 'HR' ? 'warning' : u.role === 'MANAGER' ? 'info' : undefined}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          u.status === 'ACTIVE' ? 'success' : 
                          u.status === 'PENDING' ? 'warning' : 'danger'
                        }>
                          {u.status}
                        </Badge>
                      </TableCell>
                      {isHrOrAdmin && (
                        <TableCell style={{ textAlign: 'right' }}>
                          <Button size="sm" variant="outline" onClick={() => openEditUserModal(u)}>
                            Manage Profile
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* TAB 4: DEPARTMENTS & TEAMS */}
      {activeTab === 'depts-teams' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px', alignItems: 'flex-start' }}>
          
          {/* Department Column */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={16} color="var(--accent-color)" />
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Departments</h3>
              </div>
              {isHrOrAdmin && (
                <Button size="sm" variant="outline" onClick={() => setIsCreateDeptOpen(true)}>
                  New Dept
                </Button>
              )}
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dept Code</TableHead>
                    <TableHead>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(dept => (
                    <TableRow key={dept.id}>
                      <TableCell style={{ fontFamily: 'monospace', fontSize: '11px' }}>{dept.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{dept.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>

          {/* Teams Column */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="var(--accent-color)" />
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Cross-Functional Teams</h3>
              </div>
              {isHrOrAdmin && (
                <Button size="sm" variant="outline" onClick={() => setIsCreateTeamOpen(true)}>
                  Create Team
                </Button>
              )}
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {teams.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No teams allocated yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Members Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map(team => (
                      <TableRow key={team.id}>
                        <TableCell style={{ fontWeight: 600 }}>
                          <div>{team.name}</div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>{team.description || 'No description.'}</span>
                        </TableCell>
                        <TableCell>{team.department.name}</TableCell>
                        <TableCell>
                          <Badge variant="info">{team.members.length} Members</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>

        </div>
      )}

      {/* TAB 5: ATTENDANCE AUDITING */}
      {activeTab === 'attendance' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="var(--accent-color)" />
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Attendance Audit Feed</h3>
            </div>
            
            {/* Filters Bar */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                style={{ margin: 0, height: '32px', fontSize: '11px', width: '130px' }}
              />
              <select
                value={attDept}
                onChange={(e) => setAttDept(e.target.value)}
                className="input-field"
                style={{ margin: 0, height: '32px', fontSize: '11px', width: '130px' }}
              >
                <option value="">-- All Depts --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={handleAttendanceSearch} style={{ height: '32px' }}>
                Filter
              </Button>
            </div>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {attendanceLogs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No attendance logs found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Duration (Hrs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell style={{ fontWeight: 600 }}>{log.date}</TableCell>
                      <TableCell style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Avatar name={log.employeeName} size="sm" />
                        <div>
                          <div>{log.employeeName}</div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ID: {log.employeeCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>{log.departmentName}</TableCell>
                      <TableCell style={{ fontFamily: 'monospace' }}>
                        {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell style={{ fontFamily: 'monospace' }}>
                        {log.checkOut 
                          ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--'
                        }
                      </TableCell>
                      <TableCell style={{ fontWeight: 600 }}>
                        {log.workingMinutes 
                          ? `${(log.workingMinutes / 60).toFixed(1)} hrs` 
                          : 'Active session'
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

      {/* TAB 6: SECURITY AUDIT LOGS (HR/Admin Only) */}
      {activeTab === 'audit-logs' && isHrOrAdmin && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="var(--accent-color)" />
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Security Logs Feed</h3>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAuditLogSearch(); }} style={{ display: 'flex', gap: '8px', margin: 0 }}>
              <div className="relative" style={{ width: '220px', margin: 0 }}>
                <Search className="header-search-icon" size={13} style={{ left: '10px' }} />
                <input 
                  type="text" 
                  placeholder="Search logs details..." 
                  className="header-search-input"
                  style={{ paddingLeft: '32px', fontSize: '12px', height: '32px' }}
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" variant="outline">Search</Button>
            </form>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {auditLogs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No audit log files recorded.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action Log</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </TableCell>
                      <TableCell>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.actorName}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{log.actorEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.action.includes('CREATED') ? 'success' : log.action.includes('STATUS') ? 'warning' : 'info'}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      {/* TAB 7: SYSTEM PERMISSIONS GRID */}
      {activeTab === 'permissions' && (
        <Card>
          <CardHeader>
            <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Platform Boundaries Matrix</h3>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Access Capability</TableHead>
                  <TableHead>Super Admin</TableHead>
                  <TableHead>HR Specialist</TableHead>
                  <TableHead>Department Manager</TableHead>
                  <TableHead>Staff Employee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell style={{ fontWeight: 600 }}>Approve Coworkers Account Registration</TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge>Forbidden</Badge></TableCell>
                  <TableCell><Badge>Forbidden</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ fontWeight: 600 }}>Adjust Roster Roles & Department Tags</TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge>Forbidden</Badge></TableCell>
                  <TableCell><Badge>Forbidden</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ fontWeight: 600 }}>Inspect Global Security Audit Logs</TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge>Forbidden</Badge></TableCell>
                  <TableCell><Badge>Forbidden</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ fontWeight: 600 }}>Create Projects & Allocate Tasks</TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge>Forbidden</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ fontWeight: 600 }}>Log Personal Attendance Sessions</TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                  <TableCell><Badge variant="success">Allowed</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* EDIT USER PROFILE MODAL */}
      <Modal
        isOpen={isEditUserOpen}
        onClose={() => setIsEditUserOpen(false)}
        title="Edit Employee Roster Settings"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsEditUserOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleUpdateUser} loading={actionLoading}>
              Save Settings
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <Avatar name={`${selectedUser.firstName} ${selectedUser.lastName}`} size="md" />
              <div>
                <strong style={{ fontSize: '13px' }}>{selectedUser.firstName} {selectedUser.lastName}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedUser.email}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="input-label">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="input-field"
                  disabled={actionLoading}
                >
                  <option value="PENDING">Pending Approval</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Platform Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="input-field"
                  disabled={actionLoading}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="HR">HR Specialist</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="input-label">Department</label>
                <select
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  className="input-field"
                  disabled={actionLoading}
                >
                  <option value="">-- No Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Assign Manager</label>
                <select
                  value={editManagerId}
                  onChange={(e) => setEditManagerId(e.target.value)}
                  className="input-field"
                  disabled={actionLoading}
                >
                  <option value="">-- No Manager --</option>
                  {users
                    .filter(u => u.id !== selectedUser.id && (u.role === 'MANAGER' || u.role === 'SUPER_ADMIN'))
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Designation title"
                value={editDesignation}
                onChange={(e) => setEditDesignation(e.target.value)}
                placeholder="e.g. Lead Developer"
                disabled={actionLoading}
              />

              <Input
                label="Employee ID Code"
                value={editEmployeeId}
                onChange={(e) => setEditEmployeeId(e.target.value)}
                placeholder="e.g. EMP-2026"
                disabled={actionLoading}
              />
            </div>

          </form>
        )}
      </Modal>

      {/* CREATE DEPARTMENT MODAL */}
      <Modal
        isOpen={isCreateDeptOpen}
        onClose={() => setIsCreateDeptOpen(false)}
        title="Create Department"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsCreateDeptOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateDepartment} loading={actionLoading}>
              Create Department
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateDepartment}>
          <Input
            label="Department Name"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            placeholder="e.g. Quality Assurance"
            required
            disabled={actionLoading}
          />
        </form>
      </Modal>

      {/* CREATE TEAM MODAL */}
      <Modal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        title="Create Cross-Functional Team"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsCreateTeamOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateTeam} loading={actionLoading}>
              Create Team
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Team Name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="e.g. Core Engine Crew"
            required
            disabled={actionLoading}
          />

          <div className="form-group">
            <label className="input-label">Description</label>
            <textarea
              value={newTeamDesc}
              onChange={(e) => setNewTeamDesc(e.target.value)}
              className="input-field"
              placeholder="Detail the teams core project focus..."
              style={{ minHeight: '60px', fontSize: '13px' }}
              disabled={actionLoading}
            />
          </div>

          <div className="form-group">
            <label className="input-label">Department Alignment</label>
            <select
              value={newTeamDeptId}
              onChange={(e) => setNewTeamDeptId(e.target.value)}
              className="input-field"
              required
              disabled={actionLoading}
            >
              <option value="">-- Choose Department --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="input-label" style={{ marginBottom: '6px' }}>Allocate Team Members</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              {users
                .filter(u => u.status === 'ACTIVE')
                .map(u => {
                  const name = `${u.firstName} ${u.lastName}`;
                  return (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedTeamUsers.includes(u.id)}
                        onChange={() => toggleTeamMemberSelection(u.id)}
                      />
                      <span>{name} ({u.designation || 'Staff'})</span>
                    </label>
                  );
                })
              }
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
}

export default function ReportsPage() {
  return (
    <ToastProvider>
      <AdministrationPanel />
    </ToastProvider>
  );
}
