import { Media, mockMedia, updateMockMedia } from '@/data/mock/media';

export interface MediaFilters {
  search?: string;
  folder?: string;
  type?: string;
}

export const MediaService = {
  async getMedia(filters?: MediaFilters): Promise<Media[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = [...mockMedia];
        
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            filtered = filtered.filter(m => 
              m.originalName.toLowerCase().includes(query) || 
              m.alt.toLowerCase().includes(query) ||
              m.tags.some(t => t.toLowerCase().includes(query))
            );
          }
          if (filters.folder && filters.folder !== 'all') {
            filtered = filtered.filter(m => m.folder === filters.folder);
          }
          if (filters.type && filters.type !== 'all') {
            filtered = filtered.filter(m => m.mimeType.includes(filters.type!));
          }
        }
        
        // Sort newest first
        filtered.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        
        resolve(filtered);
      }, 400);
    });
  },

  async uploadMedia(fileMock: Partial<Media>): Promise<Media> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newMedia: Media = {
          id: `media_${Date.now()}`,
          fileName: fileMock.fileName || `upload_${Date.now()}.jpg`,
          originalName: fileMock.originalName || 'uploaded_file.jpg',
          alt: fileMock.alt || '',
          mimeType: fileMock.mimeType || 'image/jpeg',
          width: fileMock.width || 1080,
          height: fileMock.height || 1080,
          size: fileMock.size || Math.floor(Math.random() * 2000000) + 100000,
          folder: fileMock.folder || 'uncategorized',
          url: fileMock.url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1080&q=80',
          thumbnail: fileMock.thumbnail || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Admin',
          usedIn: [],
          tags: fileMock.tags || []
        };
        
        updateMockMedia([newMedia, ...mockMedia]);
        resolve(newMedia);
      }, 800); // Simulate upload delay
    });
  },

  async updateMedia(id: string, data: Partial<Media>): Promise<Media> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockMedia.findIndex(m => m.id === id);
        if (index === -1) return reject(new Error('Media not found'));
        
        const updated = { ...mockMedia[index], ...data };
        const newArray = [...mockMedia];
        newArray[index] = updated;
        updateMockMedia(newArray);
        resolve(updated);
      }, 300);
    });
  },

  async deleteMedia(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        updateMockMedia(mockMedia.filter(m => m.id !== id));
        resolve();
      }, 400);
    });
  },

  async deleteMultiple(ids: string[]): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        updateMockMedia(mockMedia.filter(m => !ids.includes(m.id)));
        resolve();
      }, 500);
    });
  },
  
  async existsByName(originalName: string): Promise<boolean> {
    return mockMedia.some(m => m.originalName === originalName);
  },

  async getFolders(): Promise<string[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const folders = Array.from(new Set(mockMedia.map(m => m.folder)));
        resolve(folders);
      }, 200);
    });
  }
};
