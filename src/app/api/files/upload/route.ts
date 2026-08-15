import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get('file') as unknown as File;
    const projectId = formData.get('projectId') as string | null;
    const taskId = formData.get('taskId') as string | null;
    const messageId = formData.get('messageId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file attachment provided.' }, { status: 400 });
    }

    // 3. File Size Validation (Max 10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds the permitted 10MB limit.' }, { status: 400 });
    }

    // 4. Read File Bytes and Save to Disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create public/uploads directory if not exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Generate clean unique filename to avoid collision
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueFilename = `${Date.now()}-${sanitizedOriginalName}`;
    const filePath = join(uploadsDir, uniqueFilename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFilename}`;

    // 5. Save file metadata record in SQLite
    const fileRecord = await prisma.file.create({
      data: {
        name: file.name,
        url: fileUrl,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        uploaderId: user.id,
        projectId: projectId || null,
        taskId: taskId || null,
        messageId: messageId || null,
      }
    });

    return NextResponse.json({
      success: true,
      file: fileRecord
    });
  } catch (error) {
    console.error('File upload API error:', error);
    return NextResponse.json({ error: 'Internal server error during file upload processing' }, { status: 500 });
  }
}
