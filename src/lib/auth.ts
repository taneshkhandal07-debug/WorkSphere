import { prisma } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'worksphere_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'worksphere_default_secret_key_session_signing_auth_9988';
// Hash key to ensure it is exactly 32 bytes for aes-256-gcm
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SESSION_SECRET).digest();
const IV_LENGTH = 12; // Standard for GCM

interface SessionPayload {
  userId: string;
  expiresAt: number;
  dbToken: string;
}

function encryptToken(payload: SessionPayload): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  
  // Format: iv.encrypted.tag in hex
  return `${iv.toString('hex')}.${encrypted.toString('hex')}.${tag.toString('hex')}`;
}

function decryptToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.warn('Failed to decrypt session token (might be legacy or invalid):', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  // Best effort database session log
  const session = await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  }).catch((err) => {
    console.error('Database session creation failed (non-blocking):', err);
    return { id: '', token, userId, expiresAt };
  });

  const payload: SessionPayload = {
    userId,
    expiresAt: expiresAt.getTime(),
    dbToken: token,
  };
  const encryptedCookieValue = encryptToken(payload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encryptedCookieValue, {
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
    const encryptedToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!encryptedToken) return null;

    // Check if the cookie value is a legacy 64-character raw hex token
    if (encryptedToken.length === 64 && /^[0-9a-f]+$/.test(encryptedToken)) {
      const session = await prisma.session.findUnique({
        where: { token: encryptedToken },
        include: {
          user: true,
        },
      });

      if (!session) return null;

      if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
        cookieStore.delete(SESSION_COOKIE_NAME);
        return null;
      }

      return session.user;
    }

    // Decrypt the token statelessly
    const payload = decryptToken(encryptedToken);
    if (!payload) return null;

    if (payload.expiresAt < Date.now()) {
      // Session expired, clean up
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    // Query database directly for the user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) return null;

    return user;
  } catch (error) {
    console.error('Error fetching session user:', error);
    return null;
  }
}

export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const encryptedToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (encryptedToken) {
      if (encryptedToken.length === 64 && /^[0-9a-f]+$/.test(encryptedToken)) {
        await prisma.session.deleteMany({
          where: { token: encryptedToken },
        }).catch(() => {});
      } else {
        const payload = decryptToken(encryptedToken);
        if (payload?.dbToken) {
          await prisma.session.deleteMany({
            where: { token: payload.dbToken },
          }).catch(() => {});
        }
      }
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.error('Error destroying session:', error);
  }
}
