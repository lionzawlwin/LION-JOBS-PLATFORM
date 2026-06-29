import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

// Converts various Google Drive URL formats to a direct download URL
function toDriveDownloadUrl(url: string): string {
  // https://drive.google.com/file/d/FILE_ID/view → uc?export=download
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;

  // https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (openMatch && url.includes('drive.google.com')) {
    return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
  }

  return url;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return new Response('Unauthorized', { status: 401 });
  }

  const rawUrl = req.nextUrl.searchParams.get('url');
  if (!rawUrl) return new Response('Missing url parameter', { status: 400 });

  let targetUrl: string;
  try {
    targetUrl = toDriveDownloadUrl(decodeURIComponent(rawUrl));
  } catch {
    return new Response('Invalid url parameter', { status: 400 });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LionJobs/1.0)',
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return new Response(`Remote server returned ${upstream.status}`, { status: 502 });
    }

    const contentType        = upstream.headers.get('content-type') ?? 'application/octet-stream';
    const contentDisposition = upstream.headers.get('content-disposition') ?? '';

    // Extract filename from Content-Disposition if present
    const fnMatch = contentDisposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]+)\1/i);
    const filename = fnMatch?.[2]?.trim() || 'document';

    const headers = new Headers({
      'Content-Type':        contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    });

    const length = upstream.headers.get('content-length');
    if (length) headers.set('Content-Length', length);

    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    console.error('[download proxy]', err);
    return new Response('Failed to fetch remote file', { status: 502 });
  }
}
