'use client';

import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  Calendar, 
  Users, 
  Activity, 
  Building, 
  Search, 
  Download,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/Loading';
import Avatar from '@/components/ui/Avatar';

interface AttendanceLog {
  id: string;
  checkIn: string;
  checkOut: string | null;
  duration: number | null;
  date: string;
  user?: {
    firstName: string;
    lastName: string;
    employeeId: string | null;
    department: { name: string } | null;
  };
}

interface DepartmentStat {
  name: string;
  Total: number;
  Present: number;
  Percentage: number;
}

interface OrgStats {
  totalEmployees: number;
  presentEmployees: number;
  absentEmployees: number;
  currentlyActive: number;
  attendancePercentage: number;
}

interface Department {
  id: string;
  name: string;
}

export default function AttendancePage() {
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState('my-attendance');
  const [userRole, setUserRole] = useState<string>('EMPLOYEE');

  // Personal Logs State
  const [myLogs, setMyLogs] = useState<AttendanceLog[]>([]);
  
  // Organization Logs State
  const [orgStats, setOrgStats] = useState<OrgStats>({
    totalEmployees: 0,
    presentEmployees: 0,
    absentEmployees: 0,
    currentlyActive: 0,
    attendancePercentage: 0,
  });
  const [deptStats, setDeptStats] = useState<DepartmentStat[]>([]);
  const [orgLogs, setOrgLogs] = useState<AttendanceLog[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Search & Filter State (Admin tab)
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filterDept, setFilterDept] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  const [orgLoading, setOrgLoading] = useState(false);

  // Load personal logs
  const loadPersonalLogs = async () => {
    try {
      const res = await fetch('/api/attendance/logs');
      if (res.ok) {
        const data = await res.json();
        setMyLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Failed to retrieve personal attendance history.');
    }
  };

  // Load org logs (restricted)
  const loadOrgLogs = async () => {
    setOrgLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('date', filterDate);
      if (filterDept) queryParams.set('departmentId', filterDept);
      if (searchName) queryParams.set('searchName', searchName);

      const res = await fetch(`/api/attendance/org?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrgStats(data.stats);
        setDeptStats(data.departmentStats);
        setOrgLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrgLoading(false);
    }
  };

  // Load initial configurations
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadPersonalLogs();
      
      // Fetch dynamic user role and departments
      try {
        const profileRes = await fetch('/api/auth/me');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserRole(profileData.user.role);
          
          if (profileData.user.role !== 'EMPLOYEE') {
            // Load departments list for filter
            const deptsRes = await fetch('/api/admin/departments');
            if (deptsRes.ok) {
              const deptsData = await deptsRes.json();
              setDepartments(deptsData.departments);
            }
            // Load org attendance data
            const queryParams = new URLSearchParams({ date: filterDate });
            const orgRes = await fetch(`/api/attendance/org?${queryParams.toString()}`);
            if (orgRes.ok) {
              const orgData = await orgRes.json();
              setOrgStats(orgData.stats);
              setDeptStats(orgData.departmentStats);
              setOrgLogs(orgData.logs);
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

  // Reload org statistics when filters change
  const handleFilterSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrgLogs();
  };

  const isManagement = userRole === 'HR' || userRole === 'SUPER_ADMIN' || userRole === 'MANAGER';

  // Stats calculation (Personal)
  const totalDays = myLogs.length;
  const totalDuration = myLogs.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const avgHours = totalDays > 0 ? ((totalDuration / totalDays) / 60).toFixed(1) : '0.0';

  const formatTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return <LoadingSpinner size={32} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Attendance Logs</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Record check-in work sessions and view monthly logged attendance hours.
        </p>
      </div>

      {/* Tabs */}
      {isManagement && (
        <Tabs
          tabs={[
            { id: 'my-attendance', label: 'My Personal Logs' },
            { id: 'org-dashboard', label: 'Organization Dashboard' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id)}
        />
      )}

      {/* TAB 1: PERSONAL ATTENDANCE LOGS */}
      {activeTab === 'my-attendance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'flex-start' }}>
          
          {/* Summary Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="var(--accent-color)" />
                  <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Work Duration Summary</h3>
                </div>
              </CardHeader>
              <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Total Working Days</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{totalDays} days</div>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Average Hours / Day</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{avgHours} hours</div>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Total Hours Logged</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{(totalDuration / 60).toFixed(1)} hours</div>
                </div>
              </CardBody>
            </Card>

            <Card style={{ backgroundColor: 'var(--accent-light)', borderColor: 'rgba(99, 102, 241, 0.25)' }}>
              <CardBody style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: 'var(--accent-color)', fontSize: '12px', lineHeight: '1.4' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Work Session Policies:</strong> Ensure you check out at the end of each workday to close your session. Unclosed sessions do not calculate duration.
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Personal Log List Table */}
          <Card>
            <CardHeader>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Daily Activity Logs</h3>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {myLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No attendance history logs recorded. Start your sessions from the Dashboard.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In Time</TableHead>
                      <TableHead>Check Out Time</TableHead>
                      <TableHead>Working Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell style={{ fontWeight: 600 }}>{formatDate(log.date)}</TableCell>
                        <TableCell style={{ fontFamily: 'monospace' }}>{formatTime(log.checkIn)}</TableCell>
                        <TableCell style={{ fontFamily: 'monospace' }}>
                          {log.checkOut ? formatTime(log.checkOut) : <span style={{ color: 'var(--text-muted)' }}>Not completed</span>}
                        </TableCell>
                        <TableCell style={{ fontWeight: 500 }}>
                          {log.duration !== null ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : '--'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.checkOut ? 'success' : 'warning'}>
                            {log.checkOut ? 'COMPLETED' : 'SESSION ACTIVE'}
                          </Badge>
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

      {/* TAB 2: HR/ADMIN COMPANY-WIDE DASHBOARD */}
      {activeTab === 'org-dashboard' && isManagement && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Org KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <Card>
              <CardBody style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Staff Headcount</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px' }}>{orgStats.totalEmployees}</div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--success-bg)', color: 'var(--success-color)', borderRadius: 'var(--radius-sm)' }}>
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Present Today</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px' }}>{orgStats.presentEmployees}</div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--warning-bg)', color: 'var(--warning-color)', borderRadius: 'var(--radius-sm)' }}>
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Absent Today</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px' }}>{orgStats.absentEmployees}</div>
                </div>
              </CardBody>
            </Card>

            <Card style={{ borderColor: 'var(--accent-color)' }}>
              <CardBody style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', borderRadius: 'var(--radius-sm)' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: 600 }}>Active Headcount</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px' }}>{orgStats.currentlyActive}</div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--success-bg)', color: 'var(--success-color)', borderRadius: 'var(--radius-sm)' }}>
                  <Activity size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Attendance Rate</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px' }}>{orgStats.attendancePercentage}%</div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Search Filters Card */}
          <Card>
            <CardBody>
              <form onSubmit={handleFilterSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
                  <label className="input-label" style={{ marginBottom: '4px' }}>Date Filter</label>
                  <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="input-field" 
                  />
                </div>

                {userRole !== 'MANAGER' && (
                  <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
                    <label className="input-label" style={{ marginBottom: '4px' }}>Department</label>
                    <select
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                      className="input-field"
                    >
                      <option value="">-- All Departments --</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ margin: 0, flexGrow: 1, minWidth: '200px' }}>
                  <label className="input-label" style={{ marginBottom: '4px' }}>Employee Name</label>
                  <div className="relative">
                    <Search className="header-search-icon" size={14} style={{ left: '10px' }} />
                    <input 
                      type="text" 
                      placeholder="Search employee..." 
                      className="header-search-input"
                      style={{ paddingLeft: '32px' }}
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" variant="primary" style={{ height: '36px' }}>
                  Filter Roster
                </Button>
              </form>
            </CardBody>
          </Card>

          {/* Graphical Charts and Active Logs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px', alignItems: 'flex-start' }}>
            
            {/* Chart: Department-wise attendance */}
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building size={14} color="var(--accent-color)" />
                  <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Department Attendance (%)</h3>
                </div>
              </CardHeader>
              <CardBody style={{ height: '240px' }}>
                {deptStats.length === 0 ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No department data.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-primary)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px'
                        }}
                      />
                      <Bar dataKey="Percentage" fill="var(--accent-color)" radius={[4, 4, 0, 0]} name="Present %" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            {/* Table: Daily logs */}
            <Card>
              <CardHeader>
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Sessions Logged on {new Date(filterDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</h3>
                {orgLoading && <LoadingSpinner size={16} />}
              </CardHeader>
              <CardBody style={{ padding: 0 }}>
                {orgLogs.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No employee check-in logs registered for this date.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgLogs.map((log) => {
                        const name = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown';
                        return (
                          <TableRow key={log.id}>
                            <TableCell style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              <Avatar name={name} size="sm" />
                              <div>
                                {name}
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>
                                  ID: {log.user?.employeeId || 'UNASSIGNED'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{log.user?.department?.name || '--'}</TableCell>
                            <TableCell style={{ fontFamily: 'monospace' }}>{formatTime(log.checkIn)}</TableCell>
                            <TableCell style={{ fontFamily: 'monospace' }}>
                              {log.checkOut ? formatTime(log.checkOut) : <span style={{ color: 'var(--text-muted)' }}>Checked In</span>}
                            </TableCell>
                            <TableCell style={{ fontWeight: 500 }}>
                              {log.duration !== null ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : '--'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={log.checkOut ? 'success' : 'info'}>
                                {log.checkOut ? 'LOGGED' : 'ACTIVE'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>

          </div>
        </div>
      )}
    </div>
  );
}
