export interface ParsedMultipartResult {
  fields: Record<string, string>;
  file: {
    fieldName: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  } | null;
}

/**
 * Lightweight, zero-dependency RFC 7578 multipart/form-data parser for bounded in-memory buffers.
 */
export function parseMultipartFormData(
  body: Buffer,
  contentType: string
): ParsedMultipartResult {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  if (!boundaryMatch) {
    throw new Error('Missing multipart boundary in Content-Type header.');
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from('\r\n\r\n');

  const fields: Record<string, string> = {};
  let parsedFile: ParsedMultipartResult['file'] = null;

  let offset = body.indexOf(boundaryBuf);
  while (offset !== -1) {
    const partStart = offset + boundaryBuf.length;
    // End of multipart payload: "--<boundary>--"
    if (body[partStart] === 0x2d && body[partStart + 1] === 0x2d) {
      break;
    }

    // Skip CRLF right after boundary
    const contentStart =
      body[partStart] === 0x0d && body[partStart + 1] === 0x0a
        ? partStart + 2
        : partStart;

    const nextBoundary = body.indexOf(boundaryBuf, contentStart);
    if (nextBoundary === -1) break;

    const headerEnd = body.indexOf(headerSeparator, contentStart);
    if (headerEnd === -1 || headerEnd > nextBoundary) {
      offset = nextBoundary;
      continue;
    }

    const rawHeaders = body.slice(contentStart, headerEnd).toString('utf8');
    // Trim trailing \r\n before the next boundary marker
    let partDataEnd = nextBoundary;
    if (
      partDataEnd >= 2 &&
      body[partDataEnd - 2] === 0x0d &&
      body[partDataEnd - 1] === 0x0a
    ) {
      partDataEnd -= 2;
    }
    const partData = body.slice(headerEnd + 4, partDataEnd);

    const dispMatch = rawHeaders.match(/content-disposition:\s*form-data;\s*([^\r\n]+)/i);
    if (dispMatch) {
      const disp = dispMatch[1];
      const nameMatch = disp.match(/name="([^"]+)"/i);
      const filenameMatch = disp.match(/filename="([^"]*)"/i);
      const fieldName = nameMatch ? nameMatch[1] : 'file';

      if (filenameMatch) {
        const mimeMatch = rawHeaders.match(/content-type:\s*([^\r\n;]+)/i);
        const fileName = filenameMatch[1] || 'upload.bin';
        const mimeType = mimeMatch ? mimeMatch[1].trim() : 'application/octet-stream';
        if (!parsedFile || fieldName === 'file') {
          parsedFile = {
            fieldName,
            fileName,
            mimeType,
            buffer: partData,
          };
        }
      } else if (nameMatch) {
        fields[fieldName] = partData.toString('utf8');
      }
    }

    offset = nextBoundary;
  }

  return { fields, file: parsedFile };
}
