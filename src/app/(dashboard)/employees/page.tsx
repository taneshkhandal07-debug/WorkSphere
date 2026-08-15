'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Check, 
  X, 
  Edit2,
  Lock,
  Search,
  Eye,
  Calendar,
  Building,
  User,
  Mail,
  Briefcase
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import Avatar from '@/components/ui/Avatar';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  role: string;
  status: string;
  designation: string | null;
  departmentId: string | null;
  profileImage: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  managerId: string | null;
  manager: {
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
}

export default function EmployeesPage() {
  const { success, error, info } = useToast();
  
  // Data State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('EMPLOYEE');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tabs State (Defaults to 'directory' for standard employees)
  const [activeTab, setActiveTab] = useState('directory');
  
  // Modals & Action States
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<'reject' | 'suspend' | 'reactivate' | 'deactivate' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form Edit States
  const [editRole, setEditRole] = useState('EMPLOYEE');
  const [editDeptId, setEditDeptId] = useState('');
  const [editDesignation, setEditDesignation] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      if (usersRes.ok) {
        setUsers(usersData.users);
        setCurrentUserRole(usersData.role || 'EMPLOYEE');
        
        // If they are admin or HR, default to approvals tab.
        // If standard employee or manager, force directory tab.
        const isAdminOrHr = usersData.role === 'HR' || usersData.role === 'SUPER_ADMIN';
        setActiveTab(isAdminOrHr ? 'pending' : 'directory');
      } else {
        error('Data Error', usersData.error || 'Failed to load user directory.');
      }
      
      const deptsRes = await fetch('/api/admin/departments');
      if (deptsRes.ok) {
        const deptsData = await deptsRes.json();
        setDepartments(deptsData.departments);
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Failed to load directory components.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isAdminOrHr = currentUserRole === 'HR' || currentUserRole === 'SUPER_ADMIN';

  // Action Submit Handlers
  const submitApproval = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      // Step 1: Update roles/departments first
      const updateRes = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          role: editRole,
          departmentId: editDeptId,
          designation: editDesignation,
        }),
      });

      if (!updateRes.ok) {
        const updateData = await updateRes.json();
        error('Approval Failed', updateData.error || 'Could not assign metadata fields.');
        setActionLoading(false);
        return;
      }

      // Step 2: Enforce actual approval state
      const approveRes = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      const approveData = await approveRes.json();
      if (approveRes.ok) {
        success('User Approved', `${selectedUser.firstName} ${selectedUser.lastName} has been activated.`);
        setIsApproveOpen(false);
        fetchData();
      } else {
        error('Approval Failed', approveData.error || 'Could not approve account.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Network error during approval processing.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitEdits = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          role: editRole,
          departmentId: editDeptId,
          designation: editDesignation,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success('Profile Updated', 'Employee permissions synchronized.');
        setIsEditOpen(false);
        fetchData();
      } else {
        error('Update Failed', data.error || 'Failed to update employee details.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Network error during profile updates.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitAction = async () => {
    if (!selectedUser || !actionType) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType }),
      });

      const data = await res.json();
      if (res.ok) {
        success('Success', `Action '${actionType}' completed successfully.`);
        setIsConfirmOpen(false);
        fetchData();
      } else {
        error('Action Failed', data.error || 'Operation denied by database.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Failed to transmit action request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Triggers
  const handleApproveClick = (user: AdminUser, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(user);
    setEditRole(user.role);
    setEditDeptId(user.departmentId || '');
    setEditDesignation(user.designation || '');
    setIsApproveOpen(true);
  };

  const handleEditClick = (user: AdminUser, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(user);
    setEditRole(user.role);
    setEditDeptId(user.departmentId || '');
    setEditDesignation(user.designation || '');
    setIsEditOpen(true);
  };

  const handleActionClick = (user: AdminUser, type: 'reject' | 'suspend' | 'reactivate' | 'deactivate', e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(user);
    setActionType(type);
    setIsConfirmOpen(true);
  };

  const handleRowClick = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  // Filter Lists based on searches and states
  const pendingUsers = users.filter((u) => u.status === 'PENDING');
  
  const activeUsers = users.filter((u) => {
    // If Admin/HR, show active and suspended/rejected.
    // If Employee/Manager, the API already filters to ACTIVE, but safety filter is good.
    if (isAdminOrHr) {
      return u.status === 'ACTIVE' || u.status === 'SUSPENDED' || u.status === 'REJECTED';
    }
    return u.status === 'ACTIVE';
  });

  const filteredActiveUsers = activeUsers.filter((u) => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const email = u.email.toLowerCase();
    const dept = u.department?.name.toLowerCase() || '';
    const des = u.designation?.toLowerCase() || '';
    const query = searchTerm.toLowerCase();

    return fullName.includes(query) || email.includes(query) || dept.includes(query) || des.includes(query);
  });

  const getConfirmDetails = () => {
    if (!selectedUser || !actionType) return { title: '', desc: '', verb: '' };
    const name = `${selectedUser.firstName} ${selectedUser.lastName}`;
    switch (actionType) {
      case 'reject':
        return {
          title: 'Reject Registration',
          desc: `Are you sure you want to reject the registration request from ${name} (${selectedUser.email})? They will not be able to log in to the platform.`,
          verb: 'Reject Request',
        };
      case 'suspend':
        return {
          title: 'Suspend Account',
          desc: `Are you sure you want to suspend the account for ${name}? This will instantly log them out of all devices and prevent further workspace access.`,
          verb: 'Suspend Employee',
        };
      case 'reactivate':
        return {
          title: 'Reactivate Account',
          desc: `Are you sure you want to reactivate the account for ${name}? They will be restored to ACTIVE status and allowed to log in.`,
          verb: 'Reactivate Employee',
        };
      case 'deactivate':
        return {
          title: 'Deactivate Account',
          desc: `Are you sure you want to permanently deactivate the account for ${name}? This should be done for offboarded employees.`,
          verb: 'Deactivate Employee',
        };
    }
  };

  const confirmDetails = getConfirmDetails();

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Employees</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          {isAdminOrHr 
            ? 'Process pending account registrations, manage designations, and audit access groups.'
            : 'Search and browse coworker profiles in the company directory.'
          }
        </p>
      </div>

      {/* Tabs - Only shown to HR and Super Admins */}
      {isAdminOrHr && (
        <Tabs
          tabs={[
            { id: 'pending', label: `Pending Approvals (${pendingUsers.length})` },
            { id: 'directory', label: `Active Directory (${activeUsers.length})` },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id)}
        />
      )}

      {loading ? (
        <LoadingSpinner size={32} />
      ) : (
        <>
          {/* TAB 1: PENDING APPROVALS (HR/Admin Only) */}
          {isAdminOrHr && activeTab === 'pending' && (
            <Card>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={16} color="var(--accent-color)" />
                  <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Registration Review Pipeline</h3>
                </div>
                <Badge variant="warning">Awaiting HR Audit</Badge>
              </CardHeader>
              <CardBody style={{ padding: 0 }}>
                {pendingUsers.length === 0 ? (
                  <div style={{ padding: '40px' }}>
                    <EmptyState
                      icon={ShieldCheck}
                      title="All Clear!"
                      description="There are currently no pending account registrations awaiting HR approval. Good job!"
                    />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Email Address</TableHead>
                        <TableHead>Proposed Designation</TableHead>
                        <TableHead>Requested Role</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead style={{ textAlign: 'right' }}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map((u) => (
                        <TableRow key={u.id} onClick={() => handleRowClick(u)}>
                          <TableCell style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" src={u.profileImage} />
                            <span>{u.firstName} {u.lastName}</span>
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {u.designation || 'Not specified'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'SUPER_ADMIN' ? 'danger' : u.role === 'HR' ? 'info' : 'warning'}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(u.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              onClick={(e) => handleApproveClick(u, e)}
                              style={{ padding: '4px 8px' }}
                            >
                              <Check size={14} />
                              <span>Approve</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => handleActionClick(u, 'reject', e)}
                              style={{ padding: '4px 8px', color: 'var(--error-color)', borderColor: 'var(--error-bg)' }}
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          )}

          {/* TAB 2: ACTIVE EMPLOYEE DIRECTORY (Visible to all authorized users) */}
          {activeTab === 'directory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Search Bar */}
              <div className="header-search" style={{ width: '100%', maxWidth: '400px' }}>
                <Search className="header-search-icon" size={16} />
                <input 
                  type="text" 
                  placeholder="Search employees by name, email, department, or designation..." 
                  className="header-search-input"
                  style={{ padding: '8px 12px 8px 36px', fontSize: '13px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Card>
                <CardHeader>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="var(--accent-color)" />
                    <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Coworker Directory</h3>
                  </div>
                  <Badge variant="info">{filteredActiveUsers.length} Active Records</Badge>
                </CardHeader>
                <CardBody style={{ padding: 0 }}>
                  {filteredActiveUsers.length === 0 ? (
                    <div style={{ padding: '40px' }}>
                      <EmptyState
                        icon={Users}
                        title="No Employees Found"
                        description="Try refining your query search filters to find employees."
                      />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead>Role</TableHead>
                          {isAdminOrHr && <TableHead>Status</TableHead>}
                          {isAdminOrHr && <TableHead style={{ textAlign: 'right' }}>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredActiveUsers.map((u) => (
                          <TableRow key={u.id} onClick={() => handleRowClick(u)}>
                            <TableCell style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                              {u.employeeId || 'UNASSIGNED'}
                            </TableCell>
                            <TableCell style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" src={u.profileImage} />
                              <div>
                                {u.firstName} {u.lastName}
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                                  {u.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {u.department ? (
                                <span style={{ fontWeight: 500 }}>{u.department.name}</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell style={{ fontSize: '12px' }}>
                              {u.designation || 'None'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'SUPER_ADMIN' ? 'danger' : u.role === 'HR' ? 'info' : 'warning'}>
                                {getRoleLabel(u.role)}
                              </Badge>
                            </TableCell>
                            {isAdminOrHr && (
                              <TableCell>
                                <Badge variant={u.status === 'ACTIVE' ? 'success' : u.status === 'SUSPENDED' ? 'warning' : 'danger'}>
                                  {u.status}
                                </Badge>
                              </TableCell>
                            )}
                            {isAdminOrHr && (
                              <TableCell style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={(e) => handleEditClick(u, e)}
                                  style={{ padding: '4px 8px' }}
                                >
                                  <Edit2 size={12} />
                                  <span>Edit</span>
                                </Button>
                                
                                {u.status === 'ACTIVE' ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={(e) => handleActionClick(u, 'suspend', e)}
                                    style={{ padding: '4px 8px', color: 'var(--warning-color)', borderColor: 'var(--warning-bg)' }}
                                  >
                                    <span>Suspend</span>
                                  </Button>
                                ) : u.status === 'SUSPENDED' ? (
                                  <Button 
                                    variant="primary" 
                                    size="sm" 
                                    onClick={(e) => handleActionClick(u, 'reactivate', e)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--success-color)', borderColor: 'var(--success-color)' }}
                                  >
                                    <span>Reactivate</span>
                                  </Button>
                                ) : null}

                                {u.status !== 'DEACTIVATED' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={(e) => handleActionClick(u, 'deactivate', e)}
                                    style={{ padding: '4px 8px', color: 'var(--error-color)', borderColor: 'var(--error-bg)' }}
                                  >
                                    <span>Deactivate</span>
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardBody>
              </Card>
            </div>
          )}
        </>
      )}

      {/* COWORKER PROFILE DETAILS MODAL */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Employee Profile Details"
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)}>
            Close Details
          </Button>
        }
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header section with avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <Avatar name={`${selectedUser.firstName} ${selectedUser.lastName}`} size="lg" src={selectedUser.profileImage} />
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedUser.designation || 'Specialist'}
                </p>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <Badge variant={selectedUser.role === 'SUPER_ADMIN' ? 'danger' : selectedUser.role === 'HR' ? 'info' : 'warning'}>
                    {getRoleLabel(selectedUser.role)}
                  </Badge>
                  <Badge variant={selectedUser.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {selectedUser.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Profile Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <User size={14} />
                  <span>Employee ID</span>
                </div>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {selectedUser.employeeId || 'AWAITING APPROVAL'}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <Mail size={14} />
                  <span>Email Address</span>
                </div>
                <div style={{ fontWeight: 600 }}>{selectedUser.email}</div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <Building size={14} />
                  <span>Department</span>
                </div>
                <div style={{ fontWeight: 600 }}>
                  {selectedUser.department?.name || 'No department assigned'}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <Briefcase size={14} />
                  <span>Reporting Manager</span>
                </div>
                <div style={{ fontWeight: 600 }}>
                  {selectedUser.manager 
                    ? `${selectedUser.manager.firstName} ${selectedUser.manager.lastName}` 
                    : 'System Super Admin'
                  }
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <Calendar size={14} />
                  <span>Joining Date</span>
                </div>
                <div style={{ fontWeight: 600 }}>
                  {new Date(selectedUser.createdAt).toLocaleDateString(undefined, {
                    dateStyle: 'long'
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* APPROVAL SETTINGS MODAL */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title="Review & Approve Registration"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsApproveOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={submitApproval} loading={actionLoading}>
              Confirm & Activate
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                {selectedUser.firstName} {selectedUser.lastName}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                {selectedUser.email}
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Workspace Access Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="input-field"
              >
                <option value="EMPLOYEE">Employee (Standard member)</option>
                <option value="MANAGER">Manager (Team/Project lead)</option>
                <option value="HR">HR Manager (Employee administrator)</option>
                <option value="SUPER_ADMIN">Super Administrator (Owner)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="input-label">Assign Department</label>
              <select
                value={editDeptId}
                onChange={(e) => setEditDeptId(e.target.value)}
                className="input-field"
              >
                <option value="">-- No Department Assignment --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <Input
              label="Designation / Job Title"
              value={editDesignation}
              onChange={(e) => setEditDesignation(e.target.value)}
              placeholder="e.g. Senior Staff Writer"
            />
          </div>
        )}
      </Modal>

      {/* EDIT PROFILE MODAL (Admin Only) */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Employee Workspace Profile"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={submitEdits} loading={actionLoading}>
              Save Profile Changes
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                {selectedUser.firstName} {selectedUser.lastName} (Employee ID: {selectedUser.employeeId || 'UNASSIGNED'})
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                {selectedUser.email}
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Access Control Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="input-field"
              >
                <option value="EMPLOYEE">Employee (Standard member)</option>
                <option value="MANAGER">Manager (Team/Project lead)</option>
                <option value="HR">HR Manager (Employee administrator)</option>
                <option value="SUPER_ADMIN">Super Administrator (Owner)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="input-label">Assign Department</label>
              <select
                value={editDeptId}
                onChange={(e) => setEditDeptId(e.target.value)}
                className="input-field"
              >
                <option value="">-- No Department Assignment --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <Input
              label="Designation / Job Title"
              value={editDesignation}
              onChange={(e) => setEditDesignation(e.target.value)}
              placeholder="e.g. Engineering Lead"
            />
          </div>
        )}
      </Modal>

      {/* CONFIRM ACTION DIALOG */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={submitAction}
        title={confirmDetails.title}
        description={confirmDetails.desc}
        confirmLabel={confirmDetails.verb}
        variant={actionType === 'reactivate' ? 'primary' : 'danger'}
        isLoading={actionLoading}
      />
    </div>
  );
}
