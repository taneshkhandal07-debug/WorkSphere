'use client';

import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Check, 
  MessageSquare, 
  UserPlus, 
  CheckSquare, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string; // INFO, TASK_ASSIGNED, COMMENT_ADDED, SYSTEM_ALERT, APPROVAL
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const { success, error } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Failed to retrieve notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-all-read' }),
      });

      if (res.ok) {
        success('Success', 'All notifications marked as read.');
        fetchNotifications();
      } else {
        error('Action Failed', 'Failed to synchronize notification states.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Connection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkRead = async (id: string, link: string | null) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read', id }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((not) => (not.id === id ? { ...not, isRead: true } : not))
        );
      }
    } catch (err) {
      console.error(err);
    }

    if (link) {
      router.push(link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <CheckSquare size={16} color="var(--accent-color)" />;
      case 'COMMENT_ADDED':
        return <MessageSquare size={16} color="var(--info-color)" />;
      case 'APPROVAL':
        return <UserPlus size={16} color="var(--success-color)" />;
      case 'SYSTEM_ALERT':
        return <AlertTriangle size={16} color="var(--warning-color)" />;
      default:
        return <Info size={16} color="var(--text-muted)" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Stay updated with workspace task allocations and comment threads.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkAllRead}
            loading={actionLoading}
            style={{ gap: '6px' }}
          >
            <Check size={14} />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner size={32} />
      ) : (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color="var(--accent-color)" />
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Workspace Feed</h3>
            </div>
            <Badge variant={unreadCount > 0 ? 'danger' : 'success'}>
              {unreadCount} Unread
            </Badge>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px' }}>
                <EmptyState
                  icon={Bell}
                  title="No Notifications"
                  description="Your inbox is clear! We will alert you when tasks are assigned to you."
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map((not) => (
                  <div
                    key={not.id}
                    onClick={() => handleMarkRead(not.id, not.link)}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: not.isRead ? 'transparent' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    className="hover:bg-tertiary"
                  >
                    <div style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 'fit-content',
                      flexShrink: 0
                    }}>
                      {getIcon(not.type)}
                    </div>
                    
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {not.title}
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(not.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                        {not.message}
                      </p>
                    </div>

                    {!not.isRead && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-color)',
                        alignSelf: 'center',
                        flexShrink: 0
                      }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

    </div>
  );
}
