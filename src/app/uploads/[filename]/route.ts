import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Sanitize filename to prevent directory traversal
    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    // Check in /tmp/uploads first (for runtime uploads on Vercel)
    let filePath = join('/tmp/uploads', safeFilename);
    if (!existsSync(filePath)) {
      // Fallback to public/uploads
      filePath = join(process.cwd(), 'public', 'uploads', safeFilename);
    }
    
    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }
    
    const fileBuffer = await readFile(filePath);
    
    // Determine content type
    let contentType = 'application/octet-stream';
    const lowerFilename = safeFilename.toLowerCase();
    if (lowerFilename.endsWith('.png')) contentType = 'image/png';
    else if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (lowerFilename.endsWith('.gif')) contentType = 'image/gif';
    else if (lowerFilename.endsWith('.webp')) contentType = 'image/webp';
    else if (lowerFilename.endsWith('.pdf')) contentType = 'application/pdf';
    else if (lowerFilename.endsWith('.txt')) contentType = 'text/plain';
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Serve file route error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
