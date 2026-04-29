import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MediaUploadResponse {
  mediaId: string;
  uploaderId: string;
  roomId: string;
  messageId: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
  sizeKb: number;
  mediaType: 'IMAGE' | 'FILE' | 'VIDEO' | 'AUDIO';
  width: number;
  height: number;
  uploadedAt: string;
}

export type MediaMetadata = MediaUploadResponse;

export interface MediaUploadOptions {
  roomId?: string;
  messageId?: string;
}

@Injectable({ providedIn: 'root' })
export class MediaService {
  // Media service is exposed through the API gateway at /media
  private readonly API = 'http://localhost:8080/media';

  constructor(private http: HttpClient) {}

  /**
   * Upload a file (image, document, etc.)
   * Sends multipart/form-data with the file + uploader's userId
   */
  uploadFile(file: File, uploaderId: string, options: MediaUploadOptions = {}): Observable<MediaUploadResponse> {
    const formData = new FormData();
    this.appendUploadData(formData, file, uploaderId, options);
    return this.http.post<MediaUploadResponse>(`${this.API}/upload`, formData);
  }

  /**
   * Upload an image using the dedicated backend endpoint.
   */
  uploadImage(file: File, uploaderId: string, options: MediaUploadOptions = {}): Observable<MediaUploadResponse> {
    const formData = new FormData();
    this.appendUploadData(formData, file, uploaderId, options);
    return this.http.post<MediaUploadResponse>(`${this.API}/upload/image`, formData);
  }

  /**
   * Upload with progress tracking (useful for large files)
   */
  uploadFileWithProgress(file: File, uploaderId: string, options: MediaUploadOptions = {}): Observable<HttpEvent<MediaUploadResponse>> {
    const formData = new FormData();
    this.appendUploadData(formData, file, uploaderId, options);

    const req = new HttpRequest('POST', `${this.API}/upload`, formData, {
      reportProgress: true,
    });
    return this.http.request<MediaUploadResponse>(req);
  }

  /**
   * Upload an image with progress tracking.
   */
  uploadImageWithProgress(file: File, uploaderId: string, options: MediaUploadOptions = {}): Observable<HttpEvent<MediaUploadResponse>> {
    const formData = new FormData();
    this.appendUploadData(formData, file, uploaderId, options);

    const req = new HttpRequest('POST', `${this.API}/upload/image`, formData, {
      reportProgress: true,
    });
    return this.http.request<MediaUploadResponse>(req);
  }

  private appendUploadData(
    formData: FormData,
    file: File,
    uploaderId: string,
    options: MediaUploadOptions
  ): void {
    formData.append('file', file);
    formData.append('uploaderId', uploaderId);

    if (options.roomId) {
      formData.append('roomId', options.roomId);
    }

    if (options.messageId) {
      formData.append('messageId', options.messageId);
    }
  }

  /**
   * Get metadata for an uploaded file by its ID
   */
  getFileMetadata(fileId: string): Observable<MediaMetadata> {
    return this.http.get<MediaMetadata>(`${this.API}/${fileId}`);
  }

  /**
   * Delete a file by its ID
   */
  deleteFile(fileId: string): Observable<any> {
    return this.http.delete(`${this.API}/${fileId}`);
  }

  /**
   * Get all files uploaded by a specific user
   */
  getFilesByUser(userId: string): Observable<MediaMetadata[]> {
    return this.http.get<MediaMetadata[]>(`${this.API}/user/${userId}`);
  }

  /**
   * Helper: Determine message type based on file MIME type
   */
  getMessageType(file: File): 'IMAGE' | 'FILE' {
    return file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
  }

  /**
   * Helper: Format file size to human-readable string
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Helper: Check if a URL points to an image
   */
  isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
  }
}
