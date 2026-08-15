'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Briefcase,
  CheckSquare,
  Clock,
  Folder,
  Megaphone,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import Avatar from '../ui/Avatar';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  currentUser: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  currentUser,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Projects', path: '/projects', icon: Briefcase },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'Files', path: '/files', icon: Folder },
    { name: 'Announcements', path: '/announcements', icon: Megaphone },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'HR': return 'HR Manager';
      case 'MANAGER': return 'Manager';
      case 'EMPLOYEE': return 'Employee';
      default: return role;
    }
  };

  const fullName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : 'Guest User';

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-brand">
            <Terminal size={20} />
            <span>WorkSphere</span>
          </div>
        )}
        <button 
          onClick={onToggle} 
          className="sidebar-toggle-btn"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ margin: isCollapsed ? '0 auto' : '0' }}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
          return (
            <Link 
              key={item.path} 
              href={item.path} 
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <Avatar 
            name={fullName} 
            size="sm" 
            style={{ cursor: 'pointer' }}
          />
          {!isCollapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{fullName}</span>
              <span className="sidebar-user-role">{getRoleLabel(currentUser?.role || '')}</span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button 
            onClick={handleLogout} 
            className="btn btn-outline btn-sm w-full"
            style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        )}
        {isCollapsed && (
          <button 
            onClick={handleLogout} 
            className="header-action-btn"
            title="Sign Out"
            style={{ margin: '0 auto', padding: '6px' }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
