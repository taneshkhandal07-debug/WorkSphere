'use client';

import React, { useEffect, useState } from 'react';
import { 
  Briefcase, 
  CheckSquare, 
  Clock, 
  Megaphone, 
  Play, 
  Square,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Bell,
  Calendar,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { LoadingSpinner } from '../ui/Loading';

// Productivity mockup chart data
const chartData = [
  { name: 'Mon', TasksCompleted: 1, WorkHours: 7.5 },
  { name: 'Tue', TasksCompleted: 3, WorkHours: 8.2 },
  { name: 'Wed', TasksCompleted: 2, WorkHours: 8.0 },
  { name: 'Thu', TasksCompleted: 5, WorkHours: 9.1 },
  { name: 'Fri', TasksCompleted: 4, WorkHours: 7.8 },
];

interface DashboardViewProps {
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface StatsData {
  isCheckedIn: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  activeProjects: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  unreadMessages: number;
  unreadNotifications: number;
}

interface DeadlineTask {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  project: { name: string };
}

interface ActivityItem {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  user: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ user }) => {
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Dashboard API state
  const [stats, setStats] = useState<StatsData>({
    isCheckedIn: false,
    checkInTime: null,
    checkOutTime: null,
    activeProjects: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    unreadMessages: 0,
    unreadNotifications: 0
  });
  const [deadlines, setDeadlines] = useState<DeadlineTask[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [sessionTimer, setSessionTimer] = useState('00:00:00');

  // Load stats from API
  const loadStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setDeadlines(data.upcomingDeadlines);
        setActivities(data.activityFeed);
      } else {
        error('Data Error', 'Failed to retrieve dynamic metrics.');
      }

      // Fetch announcements
      const annRes = await fetch('/api/announcements');
      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData.announcements.slice(0, 3)); // show top 3
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Could not establish connection to statistics API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Ticking work-session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stats.isCheckedIn && stats.checkInTime) {
      const startMs = new Date(stats.checkInTime).getTime();
      interval = setInterval(() => {
        const elapsedMs = Date.now() - startMs;
        
        const h = Math.floor(elapsedMs / (1000 * 60 * 60));
        const m = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((elapsedMs % (1000 * 60)) / 1000);
        
        setSessionTimer(
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setSessionTimer('00:00:00');
    }
    return () => clearInterval(interval);
  }, [stats.isCheckedIn, stats.checkInTime]);

  // Handle check-in or checkout click
  const handleAttendanceClick = async () => {
    setActionLoading(true);
    const action = stats.isCheckedIn ? 'check-out' : 'check-in';
    try {
      const res = await fetch('/api/attendance/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await res.json();
      if (res.ok) {
        success(
          action === 'check-in' ? 'Check In Successful' : 'Check Out Successful',
          action === 'check-in' ? 'Your work session timer has started.' : 'Your session has been recorded.'
        );
        // Refresh dashboard numbers
        loadStats();
      } else {
        error('Attendance Error', data.error || 'Operation failed.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Connection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (isoStr: string | null) => {
    if (!isoStr) return '--:--';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <LoadingSpinner size={32} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Greeting Banner */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {getGreeting()}, {user.firstName}!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Here is your operational snapshot for today.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Card>
          <CardBody style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', borderRadius: 'var(--radius-sm)' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Active Projects</div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>{stats.activeProjects}</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--warning-bg)', color: 'var(--warning-color)', borderRadius: 'var(--radius-sm)' }}>
              <CheckSquare size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Pending Tasks</div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>{stats.pendingTasks}</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--success-bg)', color: 'var(--success-color)', borderRadius: 'var(--radius-sm)' }}>
              <CheckSquare size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Completed Tasks</div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>{stats.completedTasks}</div>
            </div>
          </CardBody>
        </Card>

        {stats.overdueTasks > 0 ? (
          <Card style={{ borderColor: 'var(--error-color)', backgroundColor: 'var(--error-bg)' }}>
            <CardBody style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', borderRadius: 'var(--radius-sm)' }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--error-color)', fontWeight: 600 }}>Overdue Tasks</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--error-color)', marginTop: '2px' }}>{stats.overdueTasks}</div>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }}>
                <MessageSquare size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Unread Messages</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>{stats.unreadMessages}</div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Main Content Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Productivity Chart */}
          <Card style={{ display: 'flex', flexDirection: 'column' }}>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="var(--accent-color)" />
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Workload Trends</h3>
              </div>
              <Badge variant="info">Completed Tasks & Logged Hours</Badge>
            </CardHeader>
            <CardBody style={{ flexGrow: 1, minHeight: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="TasksCompleted" 
                    stroke="var(--accent-color)" 
                    fillOpacity={1} 
                    fill="url(#colorTasks)" 
                    strokeWidth={2}
                    name="Tasks Done"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="var(--accent-color)" />
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Activity Stream</h3>
              </div>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activities.length === 0 ? (
                <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No recent activities recorded in the system.
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: act.action.startsWith('ADMIN') ? 'var(--warning-color)' : 'var(--accent-color)', 
                      marginTop: '5px',
                      flexShrink: 0
                    }} />
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{act.user}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                        {act.details}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Company Bulletins & Announcements */}
          {announcements.length > 0 && (
            <Card style={{ borderColor: 'var(--accent-color)' }}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Megaphone size={14} color="var(--accent-color)" />
                  <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Active Bulletins</h3>
                </div>
              </CardHeader>
              <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {announcements.map((ann) => (
                  <div 
                    key={ann.id} 
                    style={{ 
                      padding: '8px', 
                      borderRadius: 'var(--radius-sm)', 
                      backgroundColor: ann.priority === 'URGENT' ? 'var(--error-bg)' : 'var(--bg-secondary)',
                      borderLeft: `3px solid ${ann.priority === 'URGENT' ? 'var(--error-color)' : 'var(--accent-color)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ann.authorName}</span>
                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {ann.title}
                    </h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ann.content}
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Work Session Check In Console */}
          <Card>
            <CardHeader>
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Work Session Console</h3>
              <Badge variant={stats.isCheckedIn ? 'success' : 'warning'}>
                {stats.isCheckedIn ? 'ACTIVE' : 'OFFLINE'}
              </Badge>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Session Clock / Timer */}
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Session Duration
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: stats.isCheckedIn ? 'var(--success-color)' : 'var(--text-primary)', marginTop: '4px' }}>
                  {sessionTimer}
                </div>
              </div>

              {/* Login / Logout Log details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Check In</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{formatTime(stats.checkInTime)}</span>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Check Out</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{formatTime(stats.checkOutTime)}</span>
                </div>
              </div>

              <Button
                variant={stats.isCheckedIn ? 'danger' : 'primary'}
                onClick={handleAttendanceClick}
                loading={actionLoading}
                style={{ width: '100%', gap: '8px' }}
              >
                {stats.isCheckedIn ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                <span>{stats.isCheckedIn ? 'Check Out Session' : 'Check In Session'}</span>
              </Button>
            </CardBody>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} color="var(--accent-color)" />
                <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Upcoming Deadlines</h3>
              </div>
              <Badge variant="danger">{deadlines.length}</Badge>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deadlines.length === 0 ? (
                <div style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                  No upcoming deadlines. Excellent!
                </div>
              ) : (
                deadlines.map((task) => (
                  <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }} title={task.title}>
                        {task.title}
                      </span>
                      <Badge variant={task.priority === 'URGENT' || task.priority === 'HIGH' ? 'danger' : 'info'}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>{task.project.name}</span>
                      <span>
                        Due: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

      </div>
    </div>
  );
};
export default DashboardView;
