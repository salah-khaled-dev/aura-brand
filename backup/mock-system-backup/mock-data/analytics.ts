export interface RevenueData {
  name: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  image: string;
}

export interface DeviceData {
  name: string;
  value: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  conversionRate: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  conversionGrowth: number;
}

export const mockRevenueData: RevenueData[] = [];

export const mockTopProducts: TopProduct[] = [];

export const mockDeviceData: DeviceData[] = [];

export const mockAnalyticsSummary: AnalyticsSummary = {
  totalRevenue: 0,
  revenueGrowth: 0,
  totalOrders: 0,
  ordersGrowth: 0,
  totalCustomers: 0,
  customersGrowth: 0,
  conversionRate: 0,
  conversionGrowth: 0,
};
