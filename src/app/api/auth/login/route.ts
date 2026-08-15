import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { LoginSchema } from '@/lib/validation';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Validate fields
    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid login details' },
        { status: 400 }
      );
    }
    
    const { email, password } = validation.data;
    
    // 2. Fetch user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // 3. Verify password
    const isPasswordCorrect = await verifyPassword(password, user.passwordHash);
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // 4. Check account status
    if (user.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Your registration request was declined by HR.' },
        { status: 403 }
      );
    }
    
    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact HR.' },
        { status: 403 }
      );
    }

    if (user.status === 'DEACTIVATED') {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }
    
    // 5. Create session
    await createSession(user.id);
    
    // 6. Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: `User logged in. Current account status: ${user.status}.`,
      }
    });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login' },
      { status: 500 }
    );
  }
}
