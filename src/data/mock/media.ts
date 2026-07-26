export interface Media {
  id: string;
  fileName: string;
  originalName: string;
  alt: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  folder: string;
  bucketId: string;
  storagePath: string;
  url: string;
  thumbnail: string;
  uploadedAt: string;
  uploadedBy: string;
  usedIn: string[];
  tags: string[];
}
