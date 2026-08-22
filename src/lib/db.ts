import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import { existsSync, copyFileSync } from 'fs';
import { join } from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  let databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
  
  // Vercel serverless / ephemeral environment compatibility:
  // If we are running on Vercel or in production, and using SQLite,
  // copy the database file to /tmp/dev.db to allow write operations.
  if ((process.env.VERCEL || process.env.NODE_ENV === 'production') && databaseUrl.startsWith('file:')) {
    const sourcePath = join(process.cwd(), 'dev.db');
    const destPath = '/tmp/dev.db';
    
    try {
      if (!existsSync(destPath)) {
        console.log(`Copying SQLite database from ${sourcePath} to ${destPath} for Vercel compatibility...`);
        if (existsSync(sourcePath)) {
          copyFileSync(sourcePath, destPath);
          console.log('Database file copied successfully.');
        } else {
          console.warn(`Source database file not found at ${sourcePath}`);
        }
      }
      databaseUrl = `file:${destPath}`;
    } catch (error) {
      console.error('Failed to copy database to /tmp:', error);
    }
  }

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  prisma = new PrismaClient({ adapter });
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
}

export { prisma };
