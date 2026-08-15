'use client';

import React, { useEffect, useState } from 'react';
import { 
  Megaphone, 
  Plus, 
  Pin, 
  Calendar, 
  User, 
  Building, 
  AlertTriangle,
  FileText,
  Bookmark
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

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  priority: string; // 'NORMAL', 'IMPORTANT', 'URGENT'
  isPinned: boolean;
  targetDepartmentId: string | null;
  attachmentUrl: string | null;
  authorName: string;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
}

function AnnouncementsBulletin() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userRole, setUserRole] = useState('EMPLOYEE');

  // Filter State
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Modals & Action States
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  // Form Fields
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState('NORMAL');
  const [annIsPinned, setAnnIsPinned] = useState(false);
  const [annDeptId, setAnnDeptId] = useState('');
  const [annAttachment, setAnnAttachment] = useState('');

  // Fetch bulletins
  const fetchBulletins = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error(err);
      error('Data Error', 'Failed to retrieve company bulletins.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchBulletins();

      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setUserRole(meData.user.role);

          if (meData.user.role === 'HR' || meData.user.role === 'SUPER_ADMIN') {
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

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      error('Input Error', 'Please complete the title and content fields.');
      return;
    }

    setPublishLoading(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          priority: annPriority,
          isPinned: annIsPinned,
          targetDepartmentId: annDeptId || null,
          attachmentUrl: annAttachment || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        success('Published', `Bulletin "${annTitle}" successfully published.`);
        // Reset forms
        setAnnTitle('');
        setAnnContent('');
        setAnnPriority('NORMAL');
        setAnnIsPinned(false);
        setAnnDeptId('');
        setAnnAttachment('');
        setIsPublishOpen(false);
        // Reload
        fetchBulletins();
      } else {
        error('Publish failed', data.error || 'Failed to publish announcement.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Could not write announcement.');
    } finally {
      setPublishLoading(false);
    }
  };

  const isPublisher = userRole === 'HR' || userRole === 'SUPER_ADMIN';

  // Filter application
  const filteredAnnouncements = announcements.filter((ann) => {
    return priorityFilter === 'All' || ann.priority === priorityFilter;
  });

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'URGENT': return <Badge variant="danger">URGENT</Badge>;
      case 'IMPORTANT': return <Badge variant="warning">IMPORTANT</Badge>;
      default: return <Badge variant="info">NORMAL</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner size={32} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Company Bulletins</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Check pinned global bulletins and target department announcements.
          </p>
        </div>
        {isPublisher && (
          <Button variant="primary" onClick={() => setIsPublishOpen(true)} style={{ gap: '6px' }}>
            <Plus size={14} />
            <span>Publish Bulletin</span>
          </Button>
        )}
      </div>

      {/* Filter controls */}
      <Card>
        <CardBody style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Priority Filter</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-field"
            style={{ width: '150px', fontSize: '12px', margin: 0, height: '34px' }}
          >
            <option value="All">All Priorities</option>
            <option value="NORMAL">Normal</option>
            <option value="IMPORTANT">Important</option>
            <option value="URGENT">Urgent</option>
          </select>
        </CardBody>
      </Card>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <Card style={{ padding: '40px' }}>
          <EmptyState
            icon={Megaphone}
            title="Drive Clear"
            description="There are currently no active company bulletins published."
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAnnouncements.map((ann) => {
            const isUrgent = ann.priority === 'URGENT';
            return (
              <Card 
                key={ann.id}
                style={{ 
                  borderColor: ann.isPinned 
                    ? 'var(--accent-color)' 
                    : isUrgent 
                      ? 'var(--error-color)' 
                      : 'var(--border-color)',
                  backgroundColor: isUrgent ? 'var(--error-bg)' : 'var(--bg-primary)'
                }}
              >
                <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                  
                  {/* Meta header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {ann.isPinned && (
                        <Badge variant="info">
                          <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <Pin size={10} />
                            <span>Pinned</span>
                          </span>
                        </Badge>
                      )}
                      {getPriorityBadge(ann.priority)}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(ann.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {ann.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {ann.content}
                    </p>
                  </div>

                  {/* Attachment indicator if exists */}
                  {ann.attachmentUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <a href={ann.attachmentUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--accent-color)', fontWeight: 600, textDecoration: 'underline' }}>
                        <FileText size={12} />
                        <span>View Attachment Reference</span>
                      </a>
                    </div>
                  )}

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                  {/* Publisher footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Avatar name={ann.authorName} size="sm" />
                      <span>Published by <strong>{ann.authorName}</strong></span>
                    </div>
                    {ann.targetDepartmentId ? (
                      <span style={{ fontWeight: 500 }}>Target: Dept ID {ann.targetDepartmentId}</span>
                    ) : (
                      <span>Target: Organization Wide</span>
                    )}
                  </div>

                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* PUBLISH BULLETIN MODAL (HR/Admin Only) */}
      <Modal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        title="Publish Company Bulletin"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsPublishOpen(false)} disabled={publishLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handlePublishAnnouncement} loading={publishLoading}>
              Publish Announcement
            </Button>
          </div>
        }
      >
        <form onSubmit={handlePublishAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Announcement Title"
            value={annTitle}
            onChange={(e) => setAnnTitle(e.target.value)}
            placeholder="e.g. Q3 Town Hall & Performance Reviews"
            required
            disabled={publishLoading}
          />

          <div className="form-group">
            <label className="input-label">Content details</label>
            <textarea
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              className="input-field"
              placeholder="Detail the announcement bulletin for the company..."
              style={{ minHeight: '120px', fontSize: '13px' }}
              required
              disabled={publishLoading}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }} className="form-group">
              <label className="input-label">Priority</label>
              <select
                value={annPriority}
                onChange={(e) => setAnnPriority(e.target.value)}
                className="input-field"
                disabled={publishLoading}
              >
                <option value="NORMAL">Normal</option>
                <option value="IMPORTANT">Important</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div style={{ flex: 1 }} className="form-group">
              <label className="input-label">Target Department (Optional)</label>
              <select
                value={annDeptId}
                onChange={(e) => setAnnDeptId(e.target.value)}
                className="input-field"
                disabled={publishLoading}
              >
                <option value="">-- All Departments (Broadcast) --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={annIsPinned}
                onChange={(e) => setAnnIsPinned(e.target.checked)}
                disabled={publishLoading}
              />
              <strong>Pin to top</strong>
            </label>
          </div>

          <Input
            label="Attachment URL (Optional)"
            value={annAttachment}
            onChange={(e) => setAnnAttachment(e.target.value)}
            placeholder="e.g. /uploads/handbook.pdf"
            disabled={publishLoading}
          />
        </form>
      </Modal>

    </div>
  );
}

export default function AnnouncementsPage() {
  return (
    <ToastProvider>
      <AnnouncementsBulletin />
    </ToastProvider>
  );
}
