import { Customer, CustomerAddress, mockCustomers, updateMockCustomers, CustomerStatus } from '@/data/mock/customers';
import { eventBus } from '@/lib/events/EventBus';

export interface CustomerFilters {
  search?: string;
  status?: string;
  tags?: string;
  registrationDateRange?: { start: string; end: string };
  minOrders?: number;
  minSpent?: number;
}

export const CustomerService = {
  async getCustomers(filters?: CustomerFilters): Promise<Customer[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = [...mockCustomers];
        
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            filtered = filtered.filter(c => 
              c.fullName.toLowerCase().includes(query) || 
              c.email.toLowerCase().includes(query) ||
              c.phone.toLowerCase().includes(query) ||
              c.customerNumber.toLowerCase().includes(query)
            );
          }
          if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(c => c.status === filters.status);
          }
          if (filters.tags) {
            filtered = filtered.filter(c => c.tags.includes(filters.tags!));
          }
          if (filters.minOrders !== undefined) {
            filtered = filtered.filter(c => c.totalOrders >= filters.minOrders!);
          }
          if (filters.minSpent !== undefined) {
            filtered = filtered.filter(c => c.totalSpent >= filters.minSpent!);
          }
        }
        
        // Sort by registration date descending
        filtered.sort((a, b) => new Date(b.registrationDate ?? b.createdAt).getTime() - new Date(a.registrationDate ?? a.createdAt).getTime());
        
        resolve(filtered);
      }, 400);
    });
  },

  async getCustomer(id: string): Promise<Customer | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockCustomers.find(c => c.id === id)), 300);
    });
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || '';
        const newCustomer: Customer = {
          id: `cust_${Date.now()}`,
          customerNumber: `AURA-${String(mockCustomers.length + 1).padStart(3, '0')}`,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          name: fullName,
          fullName,
          email: data.email || '',
          phone: data.phone || '',
          gender: data.gender || 'unspecified',
          status: data.status || 'active',
          lifetimeValue: 0,
          totalSpent: 0,
          averagePurchaseValue: 0,
          averageOrderValue: 0,
          ordersCount: 0,
          totalOrders: 0,
          returnedOrdersCount: 0,
          cancelledOrdersCount: 0,
          totalRefunds: 0,
          loyaltyPoints: 0,
          wishlistCount: 0,
          cartItemsCount: 0,
          reviewsCount: 0,
          couponsUsed: 0,
          marketingConsent: data.marketingConsent || false,
          notes: data.notes || '',
          tags: data.tags || [],
          segments: data.segments || [],
          internalNotes: [],
          activities: [
            { id: `act_${Date.now()}`, type: 'registration' as const, description: 'تم إنشاء الحساب (لوحة التحكم)', date: new Date().toISOString() }
          ],
          addresses: data.addresses || [],
          registrationDate: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        
        updateMockCustomers([newCustomer, ...mockCustomers]);
        eventBus.emit('customer.created', newCustomer);
        resolve(newCustomer);
      }, 500);
    });
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCustomers.findIndex(c => c.id === id);
        if (index === -1) return reject(new Error('Customer not found'));
        
        const updated = { ...mockCustomers[index], ...data };
        
        if (data.status && data.status !== mockCustomers[index].status) {
          updated.activities = [
            ...updated.activities,
            { id: `act_${Date.now()}`, type: 'status_change', description: `تم تغيير الحالة إلى ${data.status}`, date: new Date().toISOString() }
          ];
        }

        const newArray = [...mockCustomers];
        newArray[index] = updated;
        updateMockCustomers(newArray);
        eventBus.emit('customer.updated', updated);
        resolve(updated);
      }, 500);
    });
  },

  async deleteMultiple(ids: string[]): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        updateMockCustomers(mockCustomers.filter(c => !ids.includes(c.id)));
        eventBus.emit('customer.deleted', ids);
        resolve();
      }, 500);
    });
  },

  async blockCustomer(id: string): Promise<Customer> {
    return this.updateCustomer(id, { status: 'blocked' });
  },

  async activateCustomer(id: string): Promise<Customer> {
    return this.updateCustomer(id, { status: 'active' });
  },

  async addInternalNote(id: string, note: string): Promise<Customer> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCustomers.findIndex(c => c.id === id);
        if (index === -1) return reject(new Error('Customer not found'));
        
        const customer = { ...mockCustomers[index] };
        customer.internalNotes = [
          ...customer.internalNotes,
          { id: `in_${Date.now()}`, adminName: 'Admin', text: note, date: new Date().toISOString() }
        ];
        
        customer.activities = [
          ...customer.activities,
          { id: `act_${Date.now()}`, type: 'note_added', description: 'تم إضافة ملاحظة داخلية جديدة', date: new Date().toISOString() }
        ];
        
        const newArray = [...mockCustomers];
        newArray[index] = customer;
        updateMockCustomers(newArray);
        resolve(customer);
      }, 300);
    });
  },

  async addTag(id: string, tag: string): Promise<Customer> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCustomers.findIndex(c => c.id === id);
        if (index === -1) return reject(new Error('Customer not found'));
        
        const customer = { ...mockCustomers[index] };
        if (!customer.tags.includes(tag)) {
          customer.tags = [...customer.tags, tag];
          customer.activities = [
            ...customer.activities,
            { id: `act_${Date.now()}`, type: 'tag_added', description: `تم إضافة علامة: ${tag}`, date: new Date().toISOString() }
          ];
          
          const newArray = [...mockCustomers];
          newArray[index] = customer;
          updateMockCustomers(newArray);
        }
        resolve(customer);
      }, 300);
    });
  },

  async removeTag(id: string, tag: string): Promise<Customer> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCustomers.findIndex(c => c.id === id);
        if (index === -1) return reject(new Error('Customer not found'));
        
        const customer = { ...mockCustomers[index] };
        customer.tags = customer.tags.filter(t => t !== tag);
        customer.activities = [
          ...customer.activities,
          { id: `act_${Date.now()}`, type: 'tag_removed', description: `تم إزالة علامة: ${tag}`, date: new Date().toISOString() }
        ];
        
        const newArray = [...mockCustomers];
        newArray[index] = customer;
        updateMockCustomers(newArray);
        resolve(customer);
      }, 300);
    });
  },

  async addAddress(customerId: string, address: Omit<CustomerAddress, 'id'>): Promise<Customer> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCustomers.findIndex(c => c.id === customerId);
        if (index === -1) return reject(new Error('Customer not found'));
        
        const customer = { ...mockCustomers[index] };
        
        const newAddress: CustomerAddress = {
          ...address,
          id: `addr_${Date.now()}`
        };

        if (newAddress.isDefault) {
          customer.addresses = customer.addresses.map(a => ({ ...a, isDefault: false }));
        } else if (customer.addresses.length === 0) {
          newAddress.isDefault = true;
        }

        customer.addresses = [...customer.addresses, newAddress];
        customer.activities = [
          ...customer.activities,
          { id: `act_${Date.now()}`, type: 'address_added', description: 'تم إضافة عنوان جديد', date: new Date().toISOString() }
        ];

        const newArray = [...mockCustomers];
        newArray[index] = customer;
        updateMockCustomers(newArray);
        eventBus.emit('customer.updated', customer);
        resolve(customer);
      }, 400);
    });
  },

  async updateAddress(customerId: string, addressId: string, updates: Partial<CustomerAddress>): Promise<Customer> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCustomers.findIndex(c => c.id === customerId);
        if (index === -1) return reject(new Error('Customer not found'));

        const customer = { ...mockCustomers[index] };
        let addresses = customer.addresses.map(a => (a.id === addressId ? { ...a, ...updates, id: a.id } : a));
        // Enforce a single default address.
        if (updates.isDefault) {
          addresses = addresses.map(a => ({ ...a, isDefault: a.id === addressId }));
        }
        customer.addresses = addresses;
        customer.activities = [
          ...customer.activities,
          { id: `act_${Date.now()}`, type: 'address_added', description: 'تم تعديل عنوان', date: new Date().toISOString() }
        ];

        const newArray = [...mockCustomers];
        newArray[index] = customer;
        updateMockCustomers(newArray);
        eventBus.emit('customer.updated', customer);
        resolve(customer);
      }, 400);
    });
  },

  async deleteAddress(customerId: string, addressId: string): Promise<Customer> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCustomers.findIndex(c => c.id === customerId);
        if (index === -1) return reject(new Error('Customer not found'));
        
        const customer = { ...mockCustomers[index] };
        customer.addresses = customer.addresses.filter(a => a.id !== addressId);
        
        if (customer.addresses.length > 0 && !customer.addresses.find(a => a.isDefault)) {
          customer.addresses[0].isDefault = true;
        }

        customer.activities = [
          ...customer.activities,
          { id: `act_${Date.now()}`, type: 'address_removed', description: 'تم حذف عنوان', date: new Date().toISOString() }
        ];
        
        const newArray = [...mockCustomers];
        newArray[index] = customer;
        updateMockCustomers(newArray);
        eventBus.emit('customer.updated', customer);
        resolve(customer);
      }, 400);
    });
  }
};
