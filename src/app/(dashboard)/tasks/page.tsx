'use client';

import React, { useEffect, useState } from 'react';
import { 
  CheckSquare, 
  List, 
  Columns, 
  Search, 
  AlertCircle,
  Clock,
  Plus
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { useToast, ToastProvider } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import Avatar from '@/components/ui/Avatar';
import { TaskDetailsPanel } from '@/components/tasks/TaskDetailsPanel';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  project: { name: string };
  assignee: { id: string; firstName: string; lastName: string } | null;
  creator: { firstName: string; lastName: string };
  subtasks: Array<{ id: string; isCompleted: boolean }>;
}

const statusColumns = [
  { id: 'BACKLOG', label: 'Backlog', color: 'var(--text-muted)' },
  { id: 'TODO', label: 'To Do', color: 'var(--accent-color)' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'var(--warning-color)' },
  { id: 'REVIEW', label: 'Review', color: 'var(--info-color)' },
  { id: 'DONE', label: 'Done', color: 'var(--success-color)' },
];

function TasksDashboard() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  
  // Selected task state for slide-out panel
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch tasks assigned to the current user
  const fetchMyTasks = async () => {
    try {
      // 1. Get logged-in user profile to fetch their user ID
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) return;
      const meData = await meRes.json();
      const userId = meData.user.id;

      // 2. Fetch tasks matching assigneeId
      const tasksRes = await fetch(`/api/tasks?assigneeId=${userId}`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks);
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Failed to retrieve task board updates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, []);

  // HTML5 Kanban Drag-and-Drop
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
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, status } : t)
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        success('Task Updated', 'Workspace Kanban status synchronized.');
        fetchMyTasks();
      } else {
        error('Sync Failed', 'Could not sync task status. Reverting changes.');
        fetchMyTasks();
      }
    } catch (err) {
      console.error(err);
      fetchMyTasks();
    }
  };

  const handleTaskCardClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDrawerOpen(true);
  };

  // Filters application
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'URGENT': return <Badge variant="danger">Urgent</Badge>;
      case 'HIGH': return <Badge variant="danger">High</Badge>;
      case 'MEDIUM': return <Badge variant="warning">Medium</Badge>;
      case 'LOW': return <Badge variant="info">Low</Badge>;
      default: return <Badge>{prio}</Badge>;
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
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>My Tasks</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Inspect and update tasks assigned to you across all company projects.
          </p>
        </div>

        {/* View Mode toggler */}
        <div style={{ display: 'flex', gap: '8px', border: '1px solid var(--border-color)', padding: '4px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)' }}>
          <Button 
            variant={viewMode === 'kanban' ? 'primary' : 'outline'} 
            size="sm" 
            onClick={() => setViewMode('kanban')}
            style={{ padding: '6px 10px', height: 'auto' }}
          >
            <Columns size={14} style={{ marginRight: '6px' }} />
            <span>Kanban Board</span>
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'primary' : 'outline'} 
            size="sm" 
            onClick={() => setViewMode('list')}
            style={{ padding: '6px 10px', height: 'auto' }}
          >
            <List size={14} style={{ marginRight: '6px' }} />
            <span>List View</span>
          </Button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <Card>
        <CardBody style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          
          {/* Search */}
          <div className="header-search" style={{ flexGrow: 1, minWidth: '220px', margin: 0 }}>
            <Search className="header-search-icon" size={14} style={{ left: '10px' }} />
            <input 
              type="text" 
              placeholder="Search tasks by summary or project name..." 
              className="header-search-input"
              style={{ paddingLeft: '32px', fontSize: '12px', height: '34px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Priority dropdown filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Priority</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-field"
              style={{ height: '34px', fontSize: '12px', width: '130px', margin: 0 }}
            >
              <option value="All">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

        </CardBody>
      </Card>

      {/* RENDER TASKS WORKSPACE */}
      {filteredTasks.length === 0 ? (
        <Card style={{ padding: '50px' }}>
          <EmptyState
            icon={CheckSquare}
            title="All Caught Up!"
            description="No tasks found matching your filters. Good job keeping your dashboard clean!"
          />
        </Card>
      ) : (
        <>
          {/* KANBAN BOARD VIEW */}
          {viewMode === 'kanban' && (
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', minHeight: '480px', paddingBottom: '16px' }}>
              {statusColumns.map((col) => {
                const columnTasks = filteredTasks.filter((t) => t.status === col.id);
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
                    {/* Column Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }} />
                        <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>{col.label}</span>
                      </div>
                      <Badge variant="info">{columnTasks.length}</Badge>
                    </div>

                    {/* Column Cards */}
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
                            boxShadow: 'var(--shadow-sm)'
                          }}
                          className="hover:shadow-md hover:scale-up"
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {task.project.name}
                            </span>
                            <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginTop: '2px' }}>
                              {task.title}
                            </h4>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                            {getPriorityBadge(task.priority)}
                            {task.dueDate ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                                <Clock size={10} />
                                <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <Card>
              <CardBody style={{ padding: 0 }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Checklist</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id} onClick={() => handleTaskCardClick(task.id)}>
                        <TableCell style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px' }}>
                          {task.project.name}
                        </TableCell>
                        <TableCell style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {task.title}
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
                            : '--'
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
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* TASK DETAILS SLIDE-OUT PANEL */}
      <TaskDetailsPanel
        taskId={selectedTaskId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdated={fetchMyTasks}
      />

    </div>
  );
}

export default function TasksPage() {
  return (
    <ToastProvider>
      <TasksDashboard />
    </ToastProvider>
  );
}
