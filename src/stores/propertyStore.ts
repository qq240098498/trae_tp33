import { create } from 'zustand';

export interface Property {
  id: number;
  address: string;
  landlord_name: string;
  landlord_phone: string;
  agent_contact: string;
  rent_amount: number;
  payment_cycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  deposit_amount: number;
  contract_start: string;
  contract_end: string;
  created_at: string;
  updated_at: string;
}

export interface ContractFile {
  id: number;
  property_id: number;
  filename: string;
  original_name: string;
  file_type: 'image' | 'pdf';
  file_size: number;
  uploaded_at: string;
}

export interface PaymentRecord {
  id: number;
  property_id: number;
  payment_date: string;
  amount: number;
  note: string;
  created_at: string;
}

export interface Reminder {
  id: number;
  property_id: number;
  reminder_type: '45_days' | '30_days' | '15_days';
  reminder_date: string;
  is_triggered: boolean;
  is_handled: boolean;
  address: string;
  contract_end: string;
  days_remaining: number;
}

export interface RepairRecord {
  id: number;
  property_id: number;
  repair_date: string;
  description: string;
  result: string;
  cost: number;
  landlord_borne: boolean;
  created_at: string;
}

export interface ViewingRecord {
  id: number;
  property_id: number;
  viewing_date: string;
  viewing_time: string;
  agent_name: string;
  agent_phone: string;
  note: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ViewingSettings {
  id: number | null;
  property_id: number;
  allow_weekday: boolean;
  allow_weekend: boolean;
  weekday_start: string;
  weekday_end: string;
  weekend_start: string;
  weekend_end: string;
  min_notice_hours: number;
  extra_rules: string;
  can_record?: boolean;
  contract_end?: string;
}

interface PropertyState {
  properties: Property[];
  selectedProperty: Property | null;
  reminders: Reminder[];
  files: ContractFile[];
  payments: PaymentRecord[];
  repairs: RepairRecord[];
  viewingRecords: ViewingRecord[];
  viewingSettings: ViewingSettings | null;
  viewingCanRecord: boolean;
  loading: boolean;
  error: string | null;

  fetchProperties: () => Promise<void>;
  fetchProperty: (id: number) => Promise<void>;
  createProperty: (data: Omit<Property, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProperty: (id: number, data: Partial<Property>) => Promise<void>;
  deleteProperty: (id: number) => Promise<void>;

  fetchReminders: () => Promise<void>;
  handleReminder: (id: number) => Promise<void>;

  uploadFile: (propertyId: number, file: File) => Promise<void>;
  deleteFile: (fileId: number) => Promise<void>;
  fetchFiles: (propertyId: number) => Promise<void>;

  createPayment: (propertyId: number, data: { payment_date: string; amount: number; note: string }) => Promise<void>;
  deletePayment: (paymentId: number) => Promise<void>;
  fetchPayments: (propertyId: number) => Promise<void>;

  createRepair: (propertyId: number, data: { repair_date: string; description: string; result: string; cost: number; landlord_borne: boolean }) => Promise<void>;
  updateRepair: (repairId: number, data: { repair_date: string; description: string; result: string; cost: number; landlord_borne: boolean }) => Promise<void>;
  deleteRepair: (repairId: number) => Promise<void>;
  fetchRepairs: (propertyId: number) => Promise<void>;
  exportRepairs: (propertyId: number) => Promise<void>;

  fetchViewingRecords: (propertyId: number) => Promise<void>;
  fetchViewingSettings: (propertyId: number) => Promise<void>;
  createViewingRecord: (propertyId: number, data: Omit<ViewingRecord, 'id' | 'property_id' | 'created_at'>) => Promise<void>;
  updateViewingRecord: (recordId: number, data: Omit<ViewingRecord, 'id' | 'property_id' | 'created_at'>) => Promise<void>;
  deleteViewingRecord: (recordId: number) => Promise<void>;
  saveViewingSettings: (propertyId: number, data: Omit<ViewingSettings, 'id' | 'property_id' | 'can_record' | 'contract_end'>) => Promise<void>;
  exportViewingRules: (propertyId: number) => Promise<void>;
}

export const usePropertyStore = create<PropertyState>((set, get) => ({
  properties: [],
  selectedProperty: null,
  reminders: [],
  files: [],
  payments: [],
  repairs: [],
  viewingRecords: [],
  viewingSettings: null,
  viewingCanRecord: false,
  loading: false,
  error: null,

  fetchProperties: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/properties');
      if (!res.ok) throw new Error('获取房屋列表失败');
      const result = await res.json();
      set({ properties: result.data || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchProperty: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/properties/${id}`);
      if (!res.ok) throw new Error('获取房屋详情失败');
      const result = await res.json();
      const data = result.data || {};
      const { files: f, payments: p, reminders: r, repairs: rp, ...propertyOnly } = data;
      set({
        selectedProperty: propertyOnly as Property,
        files: f || [],
        payments: p || [],
        reminders: r || [],
        repairs: rp || [],
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createProperty: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('创建房屋失败');
      await get().fetchProperties();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  updateProperty: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('更新房屋失败');
      await get().fetchProperties();
      if (get().selectedProperty?.id === id) {
        await get().fetchProperty(id);
      }
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  deleteProperty: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除房屋失败');
      await get().fetchProperties();
      if (get().selectedProperty?.id === id) {
        set({ selectedProperty: null });
      }
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchReminders: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/reminders');
      if (!res.ok) throw new Error('获取提醒列表失败');
      const result = await res.json();
      set({ reminders: result.data || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  handleReminder: async (id) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/reminders/${id}/handle`, { method: 'PUT' });
      if (!res.ok) throw new Error('处理提醒失败');
      await get().fetchReminders();
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  uploadFile: async (propertyId, file) => {
    set({ error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/properties/${propertyId}/files`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('上传文件失败');
      await get().fetchFiles(propertyId);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  deleteFile: async (fileId) => {
    set({ error: null });
    try {
      const propertyId = get().selectedProperty?.id;
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除文件失败');
      if (propertyId) {
        await get().fetchFiles(propertyId);
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchFiles: async (propertyId) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/${propertyId}/files`);
      if (!res.ok) throw new Error('获取文件列表失败');
      const result = await res.json();
      set({ files: result.data || [] });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createPayment: async (propertyId, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/${propertyId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('新增支付记录失败');
      await get().fetchPayments(propertyId);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  deletePayment: async (paymentId) => {
    set({ error: null });
    try {
      const propertyId = get().selectedProperty?.id;
      const res = await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除支付记录失败');
      if (propertyId) {
        await get().fetchPayments(propertyId);
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchPayments: async (propertyId) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/${propertyId}/payments`);
      if (!res.ok) throw new Error('获取支付记录失败');
      const result = await res.json();
      set({ payments: result.data || [] });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createRepair: async (propertyId, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/${propertyId}/repairs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('新增维修记录失败');
      await get().fetchRepairs(propertyId);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  updateRepair: async (repairId, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/repairs/${repairId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('更新维修记录失败');
      const propertyId = get().selectedProperty?.id;
      if (propertyId) {
        await get().fetchRepairs(propertyId);
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  deleteRepair: async (repairId) => {
    set({ error: null });
    try {
      const propertyId = get().selectedProperty?.id;
      const res = await fetch(`/api/repairs/${repairId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除维修记录失败');
      if (propertyId) {
        await get().fetchRepairs(propertyId);
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchRepairs: async (propertyId) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/${propertyId}/repairs`);
      if (!res.ok) throw new Error('获取维修记录失败');
      const result = await res.json();
      set({ repairs: result.data || [] });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  exportRepairs: async (propertyId) => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/repairs/export`);
      if (!res.ok) throw new Error('导出维修记录失败');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('content-disposition');
      let filename = '维修记录.txt';
      if (disposition) {
        const match = disposition.match(/filename\*?=UTF-8''(.+)/);
        if (match) filename = decodeURIComponent(match[1]);
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchViewingRecords: async (propertyId) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/${propertyId}/viewings`);
      if (!res.ok) throw new Error('获取看房记录失败');
      const result = await res.json();
      set({
        viewingRecords: result.data?.records || [],
        viewingCanRecord: result.data?.can_record || false,
      });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchViewingSettings: async (propertyId) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/${propertyId}/viewings/settings`);
      if (!res.ok) throw new Error('获取看房设置失败');
      const result = await res.json();
      const raw = result.data || {};
      set({
        viewingSettings: {
          ...raw,
          allow_weekday: !!raw.allow_weekday,
          allow_weekend: !!raw.allow_weekend,
          can_record: raw.can_record,
          contract_end: raw.contract_end,
        } as ViewingSettings,
        viewingCanRecord: raw.can_record || false,
      });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createViewingRecord: async (propertyId, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/${propertyId}/viewings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '新增看房记录失败');
      }
      await get().fetchViewingRecords(propertyId);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  updateViewingRecord: async (recordId, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/viewings/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '更新看房记录失败');
      }
      const propertyId = get().selectedProperty?.id;
      if (propertyId) {
        await get().fetchViewingRecords(propertyId);
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  deleteViewingRecord: async (recordId) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/viewings/${recordId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除看房记录失败');
      const propertyId = get().selectedProperty?.id;
      if (propertyId) {
        await get().fetchViewingRecords(propertyId);
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  saveViewingSettings: async (propertyId, data) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/properties/${propertyId}/viewings/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('保存看房设置失败');
      await get().fetchViewingSettings(propertyId);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  exportViewingRules: async (propertyId) => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/viewings/rules`);
      if (!res.ok) throw new Error('导出预约规则失败');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('content-disposition');
      let filename = '看房预约规则.txt';
      if (disposition) {
        const match = disposition.match(/filename\*?=UTF-8''(.+)/);
        if (match) filename = decodeURIComponent(match[1]);
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      set({ error: e.message });
    }
  },
}));
