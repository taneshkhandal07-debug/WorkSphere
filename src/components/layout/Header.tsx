'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Sun, Moon, Check, CheckSquare, MessageSquare, UserPlus, Info, BellOff } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Dropdown, { DropdownItem } from '../ui/Dropdown';

interface HeaderProps {
  currentUser: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export const Header: React.FC<HeaderProps> = ({ currentUser }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Sync theme with document element
  useEffect(() => {
    const activeTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'light';
    setTheme(activeTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.refresh();
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications.slice(0, 5)); // Only show top 5 in dropdown
        const countRes = await fetch('/api/notifications');
        const countData = await countRes.json();
        const unread = countData.notifications.filter((n: NotificationItem) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Header notif fetch error:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      // Poll notifications every 5 seconds for real-time counts
      const timer = setInterval(fetchNotifications, 5000);
      return () => clearInterval(timer);
    }
  }, [currentUser]);

  // Click outside listener for notifications dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-all-read' }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotifClick = async (notif: NotificationItem) => {
    setIsNotifOpen(false);
    
    // Mark as read
    if (!notif.isRead) {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark-read', id: notif.id }),
        });
        fetchNotifications();
      } catch (err) {
        console.error(err);
      }
    }

    if (notif.link) {
      router.push(notif.link);
    }
  };

  const dropdownItems: DropdownItem[] = [
    { label: 'My Settings', onClick: () => router.push('/settings') },
    { label: 'Sign Out', onClick: handleLogout, variant: 'danger' },
  ];

  const getPageTitle = (path: string | null) => {
    if (!path) return 'Dashboard';
    const segment = path.split('/')[1];
    if (!segment) return 'Dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED': return <CheckSquare size={13} color="var(--accent-color)" />;
      case 'APPROVAL': return <UserPlus size={13} color="var(--success-color)" />;
      case 'COMMENT_ADDED': return <MessageSquare size={13} color="var(--info-color)" />;
      default: return <Info size={13} color="var(--text-muted)" />;
    }
  };

  const fullName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : 'Guest User';

  return (
    <header className="header" style={{ position: 'relative' }}>
      <div className="header-title-section">
        <h1 className="header-title">{getPageTitle(pathname)}</h1>
      </div>

      <div className="header-search">
        <Search className="header-search-icon" size={14} />
        <input 
          type="text" 
          placeholder="Search projects, tasks, or messages..." 
          className="header-search-input"
        />
      </div>

      <div className="header-actions">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="header-action-btn" 
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Notifications Icon Button */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="header-action-btn" 
            title="Notifications"
            aria-label="View notifications"
            style={{ position: 'relative' }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '0',
                right: '0',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: 'var(--error-color)',
                border: '1px solid var(--bg-primary)'
              }} />
            )}
          </button>

          {/* Floating Dropdown Card */}
          {isNotifOpen && (
            <div 
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: '42px',
                right: '0',
                width: '320px',
                maxHeight: '400px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Dropdown Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Notifications ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    style={{ border: 'none', background: 'none', fontSize: '10px', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Dropdown Body */}
              <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <BellOff size={16} />
                    <span>Your notification feed is clear.</span>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: notif.isRead ? 'transparent' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        transition: 'background-color 0.15s'
                      }}
                      className="hover:bg-tertiary"
                    >
                      <div style={{ marginTop: '2px', flexShrink: 0 }}>
                        {getIcon(notif.type)}
                      </div>
                      <div style={{ minWidth: 0, flexGrow: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {notif.title}
                        </div>
                        <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer */}
              <div style={{ padding: '10px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                <button 
                  onClick={() => { setIsNotifOpen(false); router.push('/notifications'); }}
                  style={{ border: 'none', background: 'none', fontSize: '11px', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 600 }}
                >
                  View dedicated notification inbox
                </button>
              </div>

            </div>
          )}
        </div>

        {/* User Account Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
          <Dropdown
            trigger={
              <button 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none' }}
                aria-label="User menu"
              >
                <Avatar name={fullName} size="sm" style={{ cursor: 'pointer' }} />
              </button>
            }
            items={dropdownItems}
            align="right"
          />
        </div>
      </div>
    </header>
  );
};
export default Header;
