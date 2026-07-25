import { 
  RevenueData, 
  TopProduct, 
  DeviceData, 
  AnalyticsSummary,
  mockRevenueData,
  mockTopProducts,
  mockDeviceData,
  mockAnalyticsSummary
} from '@/data/mock/analytics';

export const AnalyticsService = {
  async getSummary(): Promise<AnalyticsSummary> {
    return new Promise((resolve) => setTimeout(() => resolve(mockAnalyticsSummary), 300));
  },

  async getOverviewStats(_period: 'today' | 'week' | 'month' | 'year'): Promise<RevenueData[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return mock data (in a real app, this would filter by period)
        resolve(mockRevenueData);
      }, 400);
    });
  },

  async getRevenueData(period: 'week' | 'month' | 'year' = 'month'): Promise<RevenueData[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return mock data (in a real app, this would filter by period)
        resolve(mockRevenueData);
      }, 400);
    });
  },

  async getTopProducts(): Promise<TopProduct[]> {
    return new Promise((resolve) => setTimeout(() => resolve(mockTopProducts), 300));
  },

  async getDeviceData(): Promise<DeviceData[]> {
    return new Promise((resolve) => setTimeout(() => resolve(mockDeviceData), 300));
  }
};
