'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardShellProps {
  children: React.ReactNode;
  currentUser: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children, currentUser }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="app-container">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        currentUser={currentUser}
      />
      <div className="main-content">
        <Header currentUser={currentUser} />
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
};
export default DashboardShell;
