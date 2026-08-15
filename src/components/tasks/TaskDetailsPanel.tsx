'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, 
  CheckSquare, 
  MessageSquare, 
  Calendar, 
  User, 
  AlertCircle, 
  Plus, 
  Check, 
  Trash2,
  FileText
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { LoadingSpinner } from '../ui/Loading';
import Avatar from '../ui/Avatar';

interface TaskDetailsPanelProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  project: { name: string };
  assignee: { id: string; firstName: string; lastName: string; email: string } | null;
  creator: { firstName: string; lastName: string };
  subtasks: Subtask[];
  comments: Comment[];
}

interface TeamRosterUser {
  id: string;
  firstName: string;
  lastName: string;
}

export const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
  taskId,
  isOpen,
  onClose,
  onTaskUpdated
}) => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<TaskDetail | null>(null);
  
  // Edit States
  const [description, setDescription] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [roster, setRoster] = useState<TeamRosterUser[]>([]);
  const [savingField, setSavingField] = useState<string | null>(null);

  // Fetch task detail
  const fetchTaskDetails = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data.task);
        setDescription(data.task.description || '');
      } else {
        error('Data Error', 'Failed to retrieve task specifications.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Task details request timed out.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all active users (to populate assignee list)
  const fetchUsersRoster = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setRoster(data.users.map((u: any) => ({
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
    if (isOpen && taskId) {
      fetchTaskDetails();
      fetchUsersRoster();
      setIsEditingDesc(false);
      setNewSubtaskTitle('');
      setNewCommentContent('');
    }
  }, [taskId, isOpen]);

  // Update Task Field (Status, Priority, Assignee, Due Date, Description)
  const handleUpdateTaskField = async (fieldName: string, value: any) => {
    if (!task) return;
    setSavingField(fieldName);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: value })
      });

      const data = await res.json();
      if (res.ok) {
        setTask(prev => prev ? { ...prev, [fieldName]: data.task[fieldName] } : null);
        
        // If assignee, we reload details to pull their user object
        if (fieldName === 'assigneeId') {
          fetchTaskDetails();
        }

        success('Task Updated', `Task ${fieldName} updated successfully.`);
        onTaskUpdated();
      } else {
        error('Update Failed', data.error || 'Failed to update field.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Network failure updating task details.');
    } finally {
      setSavingField(null);
    }
  };

  // Toggle checklist checkbox
  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, isCompleted })
      });

      if (res.ok) {
        setTask(prev => {
          if (!prev) return null;
          const updatedSubtasks = prev.subtasks.map(sub => 
            sub.id === subtaskId ? { ...sub, isCompleted } : sub
          );
          return { ...prev, subtasks: updatedSubtasks };
        });
        onTaskUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add checklist item
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubtaskTitle.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle })
      });

      if (res.ok) {
        const data = await res.json();
        setTask(prev => prev ? { ...prev, subtasks: [...prev.subtasks, data.subtask] } : null);
        setNewSubtaskTitle('');
        onTaskUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Post comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newCommentContent.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newCommentContent })
      });

      if (res.ok) {
        const data = await res.json();
        setTask(prev => prev ? { ...prev, comments: [data.comment, ...prev.comments] } : null);
        setNewCommentContent('');
        success('Comment Posted', 'Comment added to task history.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="task-panel-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div 
        className="task-panel-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          height: '100%',
          backgroundColor: 'var(--bg-primary)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner size={32} />
          </div>
        ) : !task ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Failed to load task details.
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span>{task.project.name}</span>
                  <span>/</span>
                  <span>TAS-{task.id.slice(0, 4).toUpperCase()}</span>
                </div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {task.title}
                </h2>
              </div>
              <button onClick={onClose} style={{ padding: '4px', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>
                <X size={18} />
              </button>
            </div>

            {/* Split Panel Body */}
            <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: '1.7fr 1.1fr', overflow: 'hidden' }}>
              
              {/* LEFT BODY: DESCRIPTION, CHECKLIST, COMMENTS */}
              <div style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px', borderRight: '1px solid var(--border-color)' }}>
                
                {/* Description */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Description
                  </h4>
                  {isEditingDesc ? (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="input-field"
                        style={{ minHeight: '100px', fontSize: '13px', resize: 'vertical' }}
                        placeholder="Describe the task and acceptance criteria..."
                      />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button variant="outline" size="sm" onClick={() => setIsEditingDesc(false)}>
                          Cancel
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm" 
                          onClick={() => {
                            handleUpdateTaskField('description', description);
                            setIsEditingDesc(false);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setIsEditingDesc(true)}
                      style={{ 
                        marginTop: '8px', 
                        padding: '10px', 
                        borderRadius: 'var(--radius-sm)', 
                        border: '1px dashed var(--border-color)', 
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: task.description ? 'var(--text-secondary)' : 'var(--text-muted)',
                        lineHeight: 1.4,
                        minHeight: '40px'
                      }}
                    >
                      {task.description || 'Add description details...'}
                    </div>
                  )}
                </div>

                {/* Subtask Checklist */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Subtasks Checklist
                  </h4>
                  
                  {/* Checklist List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {task.subtasks.map((sub) => (
                      <label 
                        key={sub.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          fontSize: '13px', 
                          color: sub.isCompleted ? 'var(--text-muted)' : 'var(--text-secondary)',
                          textDecoration: sub.isCompleted ? 'line-through' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={sub.isCompleted}
                          onChange={(e) => handleToggleSubtask(sub.id, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{sub.title}</span>
                      </label>
                    ))}
                  </div>

                  {/* Add Subtask Input Form */}
                  <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="text"
                      placeholder="Add subtask items..."
                      className="input-field"
                      style={{ height: '30px', fontSize: '12px', margin: 0 }}
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    />
                    <Button variant="outline" size="sm" type="submit" style={{ height: '30px', padding: '0 8px' }}>
                      <Plus size={14} />
                    </Button>
                  </form>
                </div>

                {/* Comments Section */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Comments Thread
                  </h4>
                  
                  <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                      type="text"
                      placeholder="Write comment..."
                      className="input-field"
                      style={{ fontSize: '12px', margin: 0 }}
                      value={newCommentContent}
                      onChange={(e) => setNewCommentContent(e.target.value)}
                    />
                    <Button variant="primary" size="sm" type="submit">
                      Post
                    </Button>
                  </form>

                  {/* Comments List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {task.comments.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                        No comments posted yet.
                      </div>
                    ) : (
                      task.comments.map((comm) => {
                        const commenterName = `${comm.user.firstName} ${comm.user.lastName}`;
                        return (
                          <div key={comm.id} style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                            <Avatar name={commenterName} size="sm" />
                            <div style={{ flexGrow: 1, backgroundColor: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-primary)' }}>
                                <span>{commenterName}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>
                                  {new Date(comm.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p style={{ marginTop: '4px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                {comm.content}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT SIDEBAR: ATTRIBUTES & ASSIGNMENT */}
              <div style={{ overflowY: 'auto', padding: '20px', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '12px' }}>
                
                {/* Status Selector */}
                <div>
                  <label className="input-label" style={{ display: 'block', marginBottom: '4px' }}>Task Status</label>
                  <select
                    value={task.status}
                    onChange={(e) => handleUpdateTaskField('status', e.target.value)}
                    className="input-field"
                    style={{ fontSize: '12px', cursor: 'pointer' }}
                    disabled={savingField === 'status'}
                  >
                    <option value="BACKLOG">Backlog</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                {/* Priority Selector */}
                <div>
                  <label className="input-label" style={{ display: 'block', marginBottom: '4px' }}>Priority Level</label>
                  <select
                    value={task.priority}
                    onChange={(e) => handleUpdateTaskField('priority', e.target.value)}
                    className="input-field"
                    style={{ fontSize: '12px', cursor: 'pointer' }}
                    disabled={savingField === 'priority'}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                {/* Assignee Selector */}
                <div>
                  <label className="input-label" style={{ display: 'block', marginBottom: '4px' }}>Assignee</label>
                  <select
                    value={task.assignee?.id || ''}
                    onChange={(e) => handleUpdateTaskField('assigneeId', e.target.value)}
                    className="input-field"
                    style={{ fontSize: '12px', cursor: 'pointer' }}
                    disabled={savingField === 'assigneeId'}
                  >
                    <option value="">-- Unassigned --</option>
                    {roster.map(r => (
                      <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>
                    ))}
                  </select>
                </div>

                {/* Due Date Selector */}
                <div>
                  <label className="input-label" style={{ display: 'block', marginBottom: '4px' }}>Due Date</label>
                  <input
                    type="date"
                    value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                    onChange={(e) => handleUpdateTaskField('dueDate', e.target.value)}
                    className="input-field"
                    style={{ fontSize: '12px', cursor: 'pointer' }}
                    disabled={savingField === 'dueDate'}
                  />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                {/* Readonly details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)' }}>
                  <div>
                    <span>Reporter:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '4px' }}>
                      {task.creator.firstName} {task.creator.lastName}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
};
