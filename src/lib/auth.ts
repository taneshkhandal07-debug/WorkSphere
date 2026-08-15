import { prisma } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'worksphere_session';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const session = await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return session;
}

export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    if (!session) return null;

    if (session.expiresAt < new Date()) {
      // Session expired, clean up
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('Error fetching session user:', error);
    return null;
  }
}

export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      }).catch(() => {});
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.error('Error destroying session:', error);
  }
}
