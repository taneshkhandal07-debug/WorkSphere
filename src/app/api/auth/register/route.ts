import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RegisterSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Validate fields
    const validation = RegisterSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const { email, password, firstName, lastName, role, departmentId, designation } = validation.data;
    
    // 2. Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists' },
        { status: 409 }
      );
    }
    
    // 3. Hash password and insert
    const passwordHash = await hashPassword(password);
    
    // Determine the status. The specification says:
    // "A user may register, but registration alone must never grant company access."
    // Status defaults to PENDING.
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role,
        status: 'PENDING', // All new accounts start as PENDING
        departmentId: departmentId || null,
        designation: designation || null,
      }
    });

    // 4. Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        details: `User registered with role ${role} and is pending HR/Admin approval.`,
      }
    });
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Account registered successfully. Your account is pending HR/Admin approval.' 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration' },
      { status: 500 }
    );
  }
}
