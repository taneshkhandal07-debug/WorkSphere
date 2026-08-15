import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding extended database model...');

  // 1. Clear database
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.file.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  
  // Set department managers to null before deleting departments to avoid SQLite dependency locks
  await prisma.department.updateMany({ data: { managerId: null } });
  // Set managerId to null on users to avoid self-relation locks
  await prisma.user.updateMany({ data: { managerId: null, departmentId: null } });
  
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Departments
  console.log('- Seeding Departments...');
  const engineering = await prisma.department.create({
    data: { name: 'Engineering', description: 'Software design, QA, and platform infrastructure development.' }
  });
  const hr = await prisma.department.create({
    data: { name: 'Human Resources', description: 'Talent sourcing, benefits administration, and employee operations.' }
  });
  const product = await prisma.department.create({
    data: { name: 'Product Management', description: 'Roadmapping, wireframing, and product design.' }
  });
  const operations = await prisma.department.create({
    data: { name: 'Operations', description: 'General company management and administration.' }
  });

  // 3. Create Teams
  console.log('- Seeding Teams...');
  const frontendTeam = await prisma.team.create({
    data: { name: 'Frontend Team', description: 'Focuses on UI components, layouts and styling.', departmentId: engineering.id }
  });
  const backendTeam = await prisma.team.create({
    data: { name: 'Backend Team', description: 'Focuses on APIs, caching, database layer.', departmentId: engineering.id }
  });
  const recruitmentTeam = await prisma.team.create({
    data: { name: 'Talent Sourcing', description: 'Hiring and interview pipeline.', departmentId: hr.id }
  });
  const designTeam = await prisma.team.create({
    data: { name: 'Product Design', description: 'Figma mockups and wireframes.', departmentId: product.id }
  });

  // 4. Create Users (Super Admin, HR, Managers, Employees, Pendings)
  console.log('- Seeding Users...');
  const pw = await bcrypt.hash('password123', 10);

  // Super Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@worksphere.com',
      firstName: 'System',
      lastName: 'Admin',
      passwordHash: pw,
      employeeId: 'EMP-001',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      designation: 'Director of Platform Operations',
      departmentId: operations.id,
    }
  });

  // HR Lead
  const hrUser = await prisma.user.create({
    data: {
      email: 'hr@worksphere.com',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      passwordHash: pw,
      employeeId: 'EMP-002',
      role: 'HR',
      status: 'ACTIVE',
      designation: 'HR Lead',
      departmentId: hr.id,
      managerId: adminUser.id,
    }
  });

  // Engineering Manager
  const engManager = await prisma.user.create({
    data: {
      email: 'manager1@worksphere.com',
      firstName: 'David',
      lastName: 'Miller',
      passwordHash: pw,
      employeeId: 'EMP-003',
      role: 'MANAGER',
      status: 'ACTIVE',
      designation: 'Engineering Manager',
      departmentId: engineering.id,
      managerId: adminUser.id,
    }
  });

  // Product Manager
  const prodManager = await prisma.user.create({
    data: {
      email: 'manager2@worksphere.com',
      firstName: 'Sophia',
      lastName: 'Chen',
      passwordHash: pw,
      employeeId: 'EMP-004',
      role: 'MANAGER',
      status: 'ACTIVE',
      designation: 'Product Lead',
      departmentId: product.id,
      managerId: adminUser.id,
    }
  });

  // Employees
  const emp1 = await prisma.user.create({
    data: {
      email: 'employee1@worksphere.com',
      firstName: 'Alex',
      lastName: 'Carter',
      passwordHash: pw,
      employeeId: 'EMP-005',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'Senior Frontend Engineer',
      departmentId: engineering.id,
      managerId: engManager.id,
    }
  });

  const emp2 = await prisma.user.create({
    data: {
      email: 'employee2@worksphere.com',
      firstName: 'Jordan',
      lastName: 'Smith',
      passwordHash: pw,
      employeeId: 'EMP-006',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'Backend Engineer',
      departmentId: engineering.id,
      managerId: engManager.id,
    }
  });

  const emp3 = await prisma.user.create({
    data: {
      email: 'employee3@worksphere.com',
      firstName: 'Emma',
      lastName: 'Watson',
      passwordHash: pw,
      employeeId: 'EMP-007',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'UI/UX Designer',
      departmentId: product.id,
      managerId: prodManager.id,
    }
  });

  const emp4 = await prisma.user.create({
    data: {
      email: 'employee4@worksphere.com',
      firstName: 'Toby',
      lastName: 'Flenderson',
      passwordHash: pw,
      employeeId: 'EMP-008',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'HR Coordinator',
      departmentId: hr.id,
      managerId: hrUser.id,
    }
  });

  // 5 additional active employees to make roster complete (15+ users)
  const emp5 = await prisma.user.create({
    data: {
      email: 'employee5@worksphere.com',
      firstName: 'Michael',
      lastName: 'Scott',
      passwordHash: pw,
      employeeId: 'EMP-009',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'Sales Lead Specialist',
      departmentId: operations.id,
      managerId: adminUser.id,
    }
  });

  const emp6 = await prisma.user.create({
    data: {
      email: 'employee6@worksphere.com',
      firstName: 'Dwight',
      lastName: 'Schrute',
      passwordHash: pw,
      employeeId: 'EMP-010',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'Assistant Regional Lead',
      departmentId: operations.id,
      managerId: adminUser.id,
    }
  });

  const emp7 = await prisma.user.create({
    data: {
      email: 'employee7@worksphere.com',
      firstName: 'Ryan',
      lastName: 'Howard',
      passwordHash: pw,
      employeeId: 'EMP-011',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'Junior Developer',
      departmentId: engineering.id,
      managerId: engManager.id,
    }
  });

  const emp8 = await prisma.user.create({
    data: {
      email: 'employee8@worksphere.com',
      firstName: 'Kelly',
      lastName: 'Kapoor',
      passwordHash: pw,
      employeeId: 'EMP-012',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'Support Engineer',
      departmentId: engineering.id,
      managerId: engManager.id,
    }
  });

  const emp9 = await prisma.user.create({
    data: {
      email: 'employee9@worksphere.com',
      firstName: 'Jim',
      lastName: 'Halpert',
      passwordHash: pw,
      employeeId: 'EMP-013',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'Senior Account Manager',
      departmentId: operations.id,
      managerId: adminUser.id,
    }
  });

  // Pending Users
  const pending1 = await prisma.user.create({
    data: {
      email: 'pending1@worksphere.com',
      firstName: 'Stanley',
      lastName: 'Hudson',
      passwordHash: pw,
      role: 'EMPLOYEE',
      status: 'PENDING',
      designation: 'QA Analyst',
      departmentId: engineering.id,
    }
  });

  const pending2 = await prisma.user.create({
    data: {
      email: 'pending2@worksphere.com',
      firstName: 'Kevin',
      lastName: 'Malone',
      passwordHash: pw,
      role: 'EMPLOYEE',
      status: 'PENDING',
      designation: 'Financial Analyst',
      departmentId: operations.id,
    }
  });

  // Rejected / Suspended accounts
  await prisma.user.create({
    data: {
      email: 'rejected@worksphere.com',
      firstName: 'Creed',
      lastName: 'Bratton',
      passwordHash: pw,
      role: 'EMPLOYEE',
      status: 'REJECTED',
      designation: 'Quality Representative',
      departmentId: operations.id,
    }
  });

  await prisma.user.create({
    data: {
      email: 'suspended@worksphere.com',
      firstName: 'Angela',
      lastName: 'Martin',
      passwordHash: pw,
      role: 'EMPLOYEE',
      status: 'SUSPENDED',
      designation: 'Senior Accountant',
      departmentId: operations.id,
      managerId: adminUser.id,
    }
  });

  // 5. Update Department Managers
  console.log('- Setting Department Managers...');
  await prisma.department.update({ where: { id: engineering.id }, data: { managerId: engManager.id } });
  await prisma.department.update({ where: { id: hr.id }, data: { managerId: hrUser.id } });
  await prisma.department.update({ where: { id: product.id }, data: { managerId: prodManager.id } });
  await prisma.department.update({ where: { id: operations.id }, data: { managerId: adminUser.id } });

  // 6. Seed Team Members
  console.log('- Adding Team Members...');
  await prisma.teamMember.create({ data: { teamId: frontendTeam.id, userId: emp1.id, role: 'MEMBER' } });
  await prisma.teamMember.create({ data: { teamId: backendTeam.id, userId: emp2.id, role: 'MEMBER' } });
  await prisma.teamMember.create({ data: { teamId: backendTeam.id, userId: engManager.id, role: 'LEAD' } });
  await prisma.teamMember.create({ data: { teamId: recruitmentTeam.id, userId: emp4.id, role: 'MEMBER' } });
  await prisma.teamMember.create({ data: { teamId: designTeam.id, userId: emp3.id, role: 'MEMBER' } });

  // 7. Seed Projects
  console.log('- Seeding Projects...');
  const proj1 = await prisma.project.create({
    data: {
      name: 'WorkSphere Core V1 Platform',
      description: 'Building the Next.js and Prisma enterprise collaborative framework.',
      status: 'ACTIVE',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
      departmentId: engineering.id,
    }
  });
  
  const proj2 = await prisma.project.create({
    data: {
      name: 'HR Portal Redesign',
      description: 'Enhancing the onboarding workflow and directory permission grids.',
      status: 'PLANNING',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), // 90 days
      departmentId: hr.id,
    }
  });

  // Project Members
  await prisma.projectMember.create({ data: { projectId: proj1.id, userId: engManager.id, role: 'OWNER' } });
  await prisma.projectMember.create({ data: { projectId: proj1.id, userId: emp1.id, role: 'MEMBER' } });
  await prisma.projectMember.create({ data: { projectId: proj1.id, userId: emp2.id, role: 'MEMBER' } });
  await prisma.projectMember.create({ data: { projectId: proj1.id, userId: emp7.id, role: 'MEMBER' } });
  await prisma.projectMember.create({ data: { projectId: proj2.id, userId: hrUser.id, role: 'OWNER' } });
  await prisma.projectMember.create({ data: { projectId: proj2.id, userId: emp3.id, role: 'MEMBER' } });

  // 8. Seed Tasks, Subtasks & Comments
  console.log('- Seeding Tasks & Subtasks...');
  const t1 = await prisma.task.create({
    data: {
      title: 'Database Schema Modeling',
      description: 'Create SQLite models and indexes in schema.prisma for all 18 entities.',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: new Date(),
      projectId: proj1.id,
      assigneeId: emp2.id,
      creatorId: engManager.id,
    }
  });

  const t2 = await prisma.task.create({
    data: {
      title: 'Frontend Layout Shell Integration',
      description: 'Implement collapsible Sidebars, Header, and responsive dashboards.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      projectId: proj1.id,
      assigneeId: emp1.id,
      creatorId: engManager.id,
    }
  });

  const t3 = await prisma.task.create({
    data: {
      title: 'Design HR Wireframes',
      description: 'Draft Figma files for the user permission approval board.',
      status: 'TODO',
      priority: 'LOW',
      projectId: proj2.id,
      assigneeId: emp3.id,
      creatorId: prodManager.id,
    }
  });

  // Subtasks
  await prisma.subtask.create({ data: { title: 'Define User models', isCompleted: true, taskId: t1.id } });
  await prisma.subtask.create({ data: { title: 'Map relation tables', isCompleted: true, taskId: t1.id } });
  await prisma.subtask.create({ data: { title: 'Code SidebarNav links', isCompleted: true, taskId: t2.id } });
  await prisma.subtask.create({ data: { title: 'Create Theme Toggler', isCompleted: false, taskId: t2.id } });

  // Comments
  await prisma.taskComment.create({
    data: {
      content: 'Database models are fully pushed and seeding scripts run cleanly!',
      taskId: t1.id,
      userId: emp2.id,
    }
  });
  await prisma.taskComment.create({
    data: {
      content: 'Excellent work, Jordan. Moving this task to Done.',
      taskId: t1.id,
      userId: engManager.id,
    }
  });

  // 9. Seed Announcements
  console.log('- Seeding Announcements...');
  await prisma.announcement.create({
    data: {
      title: 'WorkSphere Platform Initialized',
      content: 'We are excited to share that the WorkSphere enterprise platform V1 foundation has been successfully completed. Employees can now register and access their central workspace.',
      priority: 'IMPORTANT',
      isPinned: true,
      authorId: adminUser.id,
    }
  });
  
  await prisma.announcement.create({
    data: {
      title: 'Q3 Onboarding Review Guidelines',
      content: 'A reminder to all managers: please coordinate review approvals for incoming interns and contractors before the end of the week.',
      priority: 'URGENT',
      isPinned: true,
      authorId: hrUser.id,
    }
  });

  await prisma.announcement.create({
    data: {
      title: 'Engineering Sprint Launch',
      content: 'Core framework updates are scheduled for deployment this Thursday at 02:00 AM UTC. Please finalize all QA checklist updates.',
      priority: 'NORMAL',
      targetDepartmentId: engineering.id,
      authorId: engManager.id
    }
  });

  // 10. Audit Logs
  console.log('- Seeding Audit Logs...');
  await prisma.auditLog.create({ data: { userId: adminUser.id, action: 'SYSTEM_STARTUP', details: 'WorkSphere platform initialized successfully.' } });
  await prisma.auditLog.create({ data: { userId: hrUser.id, action: 'USER_REGISTERED', details: 'HR account registered.' } });
  await prisma.auditLog.create({ data: { userId: emp1.id, action: 'PROJECT_CREATED', details: 'Project WorkSphere Core V1 initialized.' } });

  // 11. Seed Attendance History (For all active users over past 5 business days)
  console.log('- Seeding Attendance Histories...');
  const activeStaff = [
    adminUser, hrUser, engManager, prodManager, 
    emp1, emp2, emp3, emp4, emp5, emp6, emp7, emp8, emp9
  ];

  for (let i = 5; i >= 1; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    
    // Skip weekends
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const dateStr = day.toISOString().split('T')[0];

    for (const staff of activeStaff) {
      // Vary check-in check-out times slightly
      const checkInHour = 9;
      const checkInMin = Math.floor(Math.random() * 20);
      const checkOutHour = 17;
      const checkOutMin = Math.floor(Math.random() * 30);

      const checkInDate = new Date(day);
      checkInDate.setHours(checkInHour, checkInMin, 0);

      const checkOutDate = new Date(day);
      checkOutDate.setHours(checkOutHour, checkOutMin, 0);

      const durationMinutes = (checkOutHour - checkInHour) * 60 + (checkOutMin - checkInMin);

      await prisma.attendance.create({
        data: {
          userId: staff.id,
          date: dateStr,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          duration: durationMinutes
        }
      });
    }
  }

  // Today's attendance checkins (currently checked-in online users)
  const todayStr = new Date().toISOString().split('T')[0];
  const checkInToday = new Date();
  checkInToday.setHours(9, 10, 0);
  
  await prisma.attendance.create({
    data: {
      userId: emp1.id,
      date: todayStr,
      checkIn: checkInToday,
      checkOut: null
    }
  });

  await prisma.attendance.create({
    data: {
      userId: emp2.id,
      date: todayStr,
      checkIn: checkInToday,
      checkOut: null
    }
  });

  // 12. Seed Communications & Messages
  console.log('- Seeding Communications Conversations & Messages...');
  
  // Group Conversation
  const groupConv = await prisma.conversation.create({
    data: {
      isGroup: true,
      name: 'Engineering Hub',
      members: {
        create: [
          { userId: engManager.id },
          { userId: emp1.id },
          { userId: emp2.id },
          { userId: emp7.id }
        ]
      }
    }
  });

  // Messages in Group
  await prisma.message.create({
    data: {
      content: 'Welcome to the Engineering Hub! Feel free to post updates here.',
      conversationId: groupConv.id,
      senderId: engManager.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4) // 4 hours ago
    }
  });

  await prisma.message.create({
    data: {
      content: 'Thanks, David. I will post progress on layout updates shortly.',
      conversationId: groupConv.id,
      senderId: emp1.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3) // 3 hours ago
    }
  });

  // Direct Message Conversation
  const dmConv = await prisma.conversation.create({
    data: {
      isGroup: false,
      members: {
        create: [
          { userId: emp1.id },
          { userId: emp2.id }
        ]
      }
    }
  });

  // Message in DM
  await prisma.message.create({
    data: {
      content: 'Hey Alex, do you need help with backend database sync points?',
      conversationId: dmConv.id,
      senderId: emp2.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30 mins ago
    }
  });

  await prisma.message.create({
    data: {
      content: 'Yes, let me check the relation maps. I will ping you on Teams.',
      conversationId: dmConv.id,
      senderId: emp1.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 25) // 25 mins ago
    }
  });

  // 13. Seed Notifications
  console.log('- Seeding Alerts & Notifications...');
  await prisma.notification.create({
    data: {
      userId: emp1.id,
      senderId: engManager.id,
      title: 'Task Assigned',
      message: 'David Miller assigned you task: "Frontend Layout Shell Integration".',
      type: 'TASK_ASSIGNED',
      link: `/projects/${proj1.id}?tab=board`
    }
  });

  await prisma.notification.create({
    data: {
      userId: emp2.id,
      senderId: engManager.id,
      title: 'Task Status Updated',
      message: 'David Miller completed review on task: "Database Schema Modeling".',
      type: 'INFO',
      link: `/projects/${proj1.id}?tab=board`
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  });
