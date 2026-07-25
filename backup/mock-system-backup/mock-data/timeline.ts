import { mockStorage } from '@/lib/storage/mock-storage';

export type EntityType = 'product' | 'order' | 'customer' | 'category' | 'collection' | 'brand' | 'cms' | 'inventory' | 'expense' | 'supplier' | 'purchase_order';
export type ActionType = 'created' | 'updated' | 'deleted' | 'archived' | 'restored' | 'published' | 'hidden' | 'scheduled' | 'status_changed' | 'stock_adjusted';

export interface TimelineEvent {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  description: string;
  diff?: Record<string, { before: any; after: any }>;
  adminId: string; // The user who performed the action
  adminName: string;
  timestamp: string; // ISO date string
  mockIp: string;
}

export let mockTimelineEvents: TimelineEvent[] = mockStorage.read('timeline', []);

export const addTimelineEvent = (event: Omit<TimelineEvent, 'id' | 'timestamp' | 'mockIp'>) => {
  const newEvent: TimelineEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    mockIp: `192.168.1.${Math.floor(Math.random() * 255)}`
  };
  mockTimelineEvents = [newEvent, ...mockTimelineEvents].slice(0, 500);
  mockStorage.write('timeline', mockTimelineEvents);
  return newEvent;
};

export const getTimelineForEntity = (entityType: EntityType, entityId: string) => {
  return mockTimelineEvents.filter(e => e.entityType === entityType && e.entityId === entityId);
};
