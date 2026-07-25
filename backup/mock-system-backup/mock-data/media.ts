import { mockStorage } from '@/lib/storage/mock-storage';

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
  url: string;
  thumbnail: string;
  uploadedAt: string;
  uploadedBy: string;
  usedIn: string[];
  tags: string[];
}

export let mockMedia: Media[] = [];

mockMedia = mockStorage.read('media', mockMedia);

export const updateMockMedia = (newMedia: Media[]) => {
  mockMedia = newMedia;
  mockStorage.write('media', newMedia);
};
