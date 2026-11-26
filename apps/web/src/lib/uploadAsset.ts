import { apiFetch } from "./api";

export type UploadMediaKind = "image" | "video" | "audio";

export interface UploadCropParameters {
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface UploadAssetResult {
  assetId?: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  isAnimated: boolean;
  frameCount?: number;
  loopCount?: number | null;
  requestId?: string;
}

export const FOUNDER_USER_ID = "cmw4fbemh0000a1sa2h3h5zzk";

export interface UploadAssetOptions {
  file: File;
  targetSlot?: string;
  kind?: UploadMediaKind;
  unlimitedSize?: boolean;
  cropData?: UploadCropParameters | null;
  signal?: AbortSignal;
  onProgress?: (percent: number, stage: string) => void;
}

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_MEDIA_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB (video / audio)

const ACCEPTED_IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);
const ACCEPTED_IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

const ACCEPTED_VIDEO_MIME = new Set(["video/mp4", "video/webm"]);
const ACCEPTED_VIDEO_EXT = new Set(["mp4", "webm"]);

const ACCEPTED_AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "application/ogg",
]);
const ACCEPTED_AUDIO_EXT = new Set(["mp3", "wav", "ogg"]);

export class ClientUploadError extends Error {
  public readonly status: number;
  public readonly category: string;

  constructor(message: string, status = 0, category = "client") {
    super(message);
    this.name = "ClientUploadError";
    this.status = status;
    this.category = category;
  }
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function validateUploadFile(
  file: File,
  kind: UploadMediaKind = "image",
  options?: { unlimitedSize?: boolean }
): string | null {
  if (!file || file.size <= 0) {
    return "Selected file is empty. Please choose a valid file.";
  }

  const mime = (file.type || "").toLowerCase();
  const ext = getFileExtension(file.name || "");

  if (kind === "image") {
    const validMime = mime ? ACCEPTED_IMAGE_MIME.has(mime) : false;
    const validExt = ACCEPTED_IMAGE_EXT.has(ext);
    if (!validMime && !(!mime && validExt) && !(mime === "application/octet-stream" && validExt)) {
      return "This file format is not supported. Please upload PNG, JPG, WEBP, or GIF.";
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      return `This image exceeds the maximum 10 MB upload size (${(file.size / (1024 * 1024)).toFixed(2)} MB).`;
    }
    return null;
  }

  if (kind === "video") {
    const validMime = mime ? ACCEPTED_VIDEO_MIME.has(mime) : false;
    const validExt = ACCEPTED_VIDEO_EXT.has(ext);
    if (!validMime && !validExt) {
      return "Unsupported video format. Please upload MP4 or WebM.";
    }
    if (!options?.unlimitedSize && file.size > MAX_MEDIA_UPLOAD_BYTES) {
      return "Video file exceeds the maximum upload limit of 25 MB. Please select a smaller video.";
    }
    return null;
  }

  const validMime = mime ? ACCEPTED_AUDIO_MIME.has(mime) : false;
  const validExt = ACCEPTED_AUDIO_EXT.has(ext);
  if (!validMime && !validExt) {
    return "Unsupported audio format. Please upload MP3, WAV, or OGG.";
  }
  if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
    return `This audio file exceeds the maximum 25 MB upload size (${(file.size / (1024 * 1024)).toFixed(2)} MB).`;
  }
  return null;
}

/**
 * Maps HTTP upload response statuses to accurate, non-misleading user feedback.
 * Never blames authentication unless the backend actually returned 401.
 */
export function mapUploadHttpError(status: number, serverMessage?: string): string {
  const cleanServerMsg = typeof serverMessage === "string" ? serverMessage.trim() : "";

  switch (status) {
    case 400:
      return cleanServerMsg || "Invalid upload request. Please verify the file and try again.";
    case 401:
      return "Your session has expired. Please sign in again to upload assets.";
    case 403:
      return cleanServerMsg || "Upload permission denied for this account.";
    case 413:
      return cleanServerMsg || "This image exceeds the maximum upload size.";
    case 415:
      return cleanServerMsg || "This file format is not supported.";
    case 429:
      return cleanServerMsg || "Too many upload attempts. Please wait a moment and try again.";
    case 500:
      return cleanServerMsg || "Unexpected server error while processing your upload. Please try again.";
    case 502:
      return "Upload upstream service error (502). Please try again shortly.";
    case 503:
      return "Image upload is temporarily unavailable. Please try again shortly.";
    case 504:
      return "Upload service timed out. Please try again.";
    default:
      return cleanServerMsg || `Upload failed (HTTP ${status}). Please try again.`;
  }
}

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Upload aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Uploads an image or media asset through the centralized authenticated upload pipeline (`/api/rpc/upload`).
 * - Performs client-side format/size validation for fast feedback
 * - Uses binary multipart FormData (smaller payload than base64 JSON, preserving full animation & fidelity)
 * - Automatically wakes/retries transient cold-start 502/503/504 responses up to 2 times
 */
export async function uploadMediaAsset(options: UploadAssetOptions): Promise<UploadAssetResult> {
  const {
    file,
    targetSlot = "studio_asset",
    kind = "image",
    unlimitedSize = false,
    cropData,
    signal,
    onProgress,
  } = options;

  const validationError = validateUploadFile(file, kind, { unlimitedSize });
  if (validationError) {
    throw new ClientUploadError(validationError, 400, "validation");
  }

  onProgress?.(15, "Preparing file...");

  // Materialize file bytes into an in-memory Blob so cold-start 503 retries never lose file handles
  const fileBuffer = await file.arrayBuffer();
  const fileBlob = new Blob([fileBuffer], {
    type: file.type || "application/octet-stream",
  });

  const formData = new FormData();
  formData.append("file", fileBlob, file.name);
  formData.append("fileName", file.name);
  formData.append("targetSlot", targetSlot);
  if (cropData) {
    formData.append("cropData", JSON.stringify(cropData));
  }

  const maxTransientRetries = 2;
  const retryDelays = [1500, 2500];

  for (let attempt = 0; attempt <= maxTransientRetries; attempt++) {
    if (signal?.aborted) {
      throw new ClientUploadError("Upload cancelled.", 0, "cancelled");
    }

    onProgress?.(attempt === 0 ? 45 : 35, attempt === 0 ? "Uploading to Pixel.gg Storage..." : "Waking upload service & retrying...");

    let res: Response;
    try {
      res = await apiFetch("/api/rpc/upload", {
        method: "POST",
        body: formData,
        signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ClientUploadError("Upload cancelled.", 0, "cancelled");
      }
      if (attempt < maxTransientRetries) {
        await apiFetch("/api/health", { method: "GET", signal }).catch(() => {});
        await sleepWithAbort(retryDelays[attempt], signal);
        continue;
      }
      throw new ClientUploadError(
        "Network error while reaching upload server. Please check your connection and try again.",
        503,
        "network"
      );
    }

    if ([502, 503, 504].includes(res.status) && attempt < maxTransientRetries) {
      await apiFetch("/api/health", { method: "GET", signal }).catch(() => {});
      await sleepWithAbort(retryDelays[attempt], signal);
      continue;
    }

    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
      category?: string;
      url?: string;
      assetId?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      width?: number | null;
      height?: number | null;
      isAnimated?: boolean;
      frameCount?: number;
      loopCount?: number | null;
      requestId?: string;
    };

    if (!res.ok) {
      const msg = mapUploadHttpError(res.status, payload?.error);
      throw new ClientUploadError(msg, res.status, payload?.category || "server");
    }

    if (!payload?.url || typeof payload.url !== "string") {
      throw new ClientUploadError(
        "Upload server succeeded without returning an asset URL. Please try again.",
        500,
        "server"
      );
    }

    onProgress?.(100, "Upload complete");

    return {
      assetId: payload.assetId,
      url: payload.url,
      fileName: payload.fileName || file.name,
      fileSize: Number(payload.fileSize || file.size),
      mimeType: payload.mimeType || file.type || "image/png",
      width: payload.width ?? null,
      height: payload.height ?? null,
      isAnimated: Boolean(payload.isAnimated),
      frameCount: payload.frameCount,
      loopCount: payload.loopCount ?? null,
      requestId: payload.requestId,
    };
  }

  throw new ClientUploadError(
    "Image upload is temporarily unavailable. Please try again shortly.",
    503,
    "service_unavailable"
  );
}
