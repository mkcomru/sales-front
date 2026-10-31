import { apiClient, api } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { handleApiError } from '../utils/errors';
import type {
  AttachmentType,
  ArtifactPresignedUploadRequest,
  ArtifactPresignedUploadResponse,
  ArtifactPresignedUrlResponse,
  ArtifactUploadResponse,
} from '../types/api';

async function putToPresignedUrl(
  uploadUrl: string,
  file: File,
  requiredHeaders: Record<string, string>,
): Promise<void> {
  const headers = new Headers(requiredHeaders);
  const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers });
  if (!res.ok) {
    throw new Error(`S3 upload failed: HTTP ${res.status}`);
  }
}

async function uploadViaMultipart(
  companyId: number,
  file: File,
  fileType: AttachmentType,
  contentType: string,
): Promise<{ artifact_id: string }> {
  const form = new FormData();
  form.append('file', file, file.name || 'upload.bin');
  form.append('file_type', fileType);
  form.append('content_type', contentType);
  form.append('filename', file.name || 'upload.bin');
  form.append('byte_size', String(file.size));

  const data = await api(apiClient.post<ArtifactUploadResponse>(
    API_ENDPOINTS.ARTIFACTS.UPLOAD(companyId),
    form,
  ));
  return { artifact_id: data.artifact_id };
}

function inferContentType(file: File, fileType: AttachmentType): string {
  if (file.type) return file.type;
  const n = file.name.toLowerCase();
  if (fileType === 'audio') return 'audio/mpeg';
  if (fileType === 'image') {
    if (n.endsWith('.png')) return 'image/png';
    if (n.endsWith('.webp')) return 'image/webp';
    if (n.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }
  if (fileType === 'video') {
    if (n.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.txt')) return 'text/plain';
  if (n.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (n.endsWith('.doc')) return 'application/msword';
  return 'application/octet-stream';
}

export const artifactsService = {
  async getPresignedDownloadUrl(companyId: number, artifactId: string): Promise<ArtifactPresignedUrlResponse> {
    return api(apiClient.get<ArtifactPresignedUrlResponse>(
      API_ENDPOINTS.ARTIFACTS.PRESIGNED_GET(companyId),
      { params: { artifact_id: artifactId } },
    ));
  },

  async upload(companyId: number, file: File, fileType: AttachmentType): Promise<{ artifact_id: string }> {
    const contentType = inferContentType(file, fileType);
    const body: ArtifactPresignedUploadRequest = {
      file_type: fileType,
      filename: file.name || 'upload.bin',
      content_type: contentType,
      byte_size: file.size,
    };
    try {
      const intent = await apiClient.post<ArtifactPresignedUploadResponse>(
        API_ENDPOINTS.ARTIFACTS.PRESIGNED_UPLOAD(companyId),
        body,
      );
      await putToPresignedUrl(intent.data.upload_url, file, intent.data.required_headers);
      return { artifact_id: intent.data.artifact_id };
    } catch {
      try {
        return await uploadViaMultipart(companyId, file, fileType, contentType);
      } catch (error) {
        handleApiError(error);
      }
    }
  },

  async uploadVoice(companyId: number, file: File): Promise<{ artifact_id: string }> {
    const form = new FormData();
    form.append('file', file);
    const data = await api(apiClient.post<ArtifactUploadResponse>(
      API_ENDPOINTS.ARTIFACTS.VOICE_UPLOAD(companyId),
      form,
    ));
    return { artifact_id: data.artifact_id };
  },
};
