import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Upload, Trash2, Image, FileText, Clock, Plus, X, User, Phone, DollarSign, Calendar, Building2, Wrench, Download, CheckCircle, Eye, Settings, Copy, AlertCircle, Droplets, Zap, Flame } from 'lucide-react';
import { usePropertyStore } from '@/stores/propertyStore';
import PropertyForm from '@/components/PropertyForm';
import type { Property, ViewingRecord, ViewingSettings, UtilityRecord } from '@/stores/propertyStore';

const cycleLabels: Record<string, string> = {
  monthly: '月付',
  quarterly: '季付',
  semi_annual: '半年付',
  annual: '年付',
};

type TabKey = 'info' | 'files' | 'payments' | 'repairs' | 'reminders' | 'viewings' | 'utilities';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'info', label: '基本信息' },
  { key: 'files', label: '合同文件' },
  { key: 'payments', label: '支付记录' },
  { key: 'repairs', label: '维修报修' },
  { key: 'reminders', label: '到期提醒' },
  { key: 'viewings', label: '看房/带看记录' },
  { key: 'utilities', label: '水电煤交接' },
];

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numId = Number(id);
  const {
    selectedProperty,
    files,
    payments,
    reminders,
    repairs,
    viewingRecords,
    viewingSettings,
    viewingCanRecord,
    utilityRecords,
    fetchProperty,
    fetchFiles,
    fetchPayments,
    fetchReminders,
    fetchRepairs,
    updateProperty,
    deleteProperty,
    uploadFile,
    deleteFile,
    createPayment,
    deletePayment,
    handleReminder,
    createRepair,
    updateRepair,
    deleteRepair,
    exportRepairs,
    fetchViewingRecords,
    fetchViewingSettings,
    createViewingRecord,
    updateViewingRecord,
    deleteViewingRecord,
    saveViewingSettings,
    exportViewingRules,
    fetchUtilityRecords,
    createUtilityRecord,
    updateUtilityRecord,
    deleteUtilityRecord,
    uploadUtilityPhoto,
    deleteUtilityPhoto,
    exportHandoverForm,
  } = usePropertyStore();

  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ payment_date: '', amount: '', note: '' });
  const [showAddRepair, setShowAddRepair] = useState(false);
  const [editingRepairId, setEditingRepairId] = useState<number | null>(null);
  const [repairForm, setRepairForm] = useState({ repair_date: '', description: '', result: '', cost: '', landlord_borne: false });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddViewing, setShowAddViewing] = useState(false);
  const [editingViewingId, setEditingViewingId] = useState<number | null>(null);
  const [viewingForm, setViewingForm] = useState({
    viewing_date: '',
    viewing_time: '',
    agent_name: '',
    agent_phone: '',
    note: '',
    status: 'scheduled' as ViewingRecord['status'],
  });
  const [showViewingSettings, setShowViewingSettings] = useState(false);
  const [viewingSettingsForm, setViewingSettingsForm] = useState<Omit<ViewingSettings, 'id' | 'property_id' | 'can_record' | 'contract_end'>>({
    allow_weekday: true,
    allow_weekend: true,
    weekday_start: '09:00',
    weekday_end: '18:00',
    weekend_start: '10:00',
    weekend_end: '18:00',
    min_notice_hours: 24,
    extra_rules: '',
  });

  const [showAddUtility, setShowAddUtility] = useState(false);
  const [editingUtilityId, setEditingUtilityId] = useState<number | null>(null);
  const [utilityForm, setUtilityForm] = useState({
    type: 'water' as UtilityRecord['type'],
    record_type: 'check_in' as UtilityRecord['record_type'],
    reading: '',
    unit: '',
    record_date: '',
    note: '',
  });
  const utilityPhotoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhotoForRecord, setUploadingPhotoForRecord] = useState<number | null>(null);

  useEffect(() => {
    if (numId) {
      fetchProperty(numId);
      fetchFiles(numId);
      fetchPayments(numId);
      fetchReminders();
      fetchRepairs(numId);
    }
  }, [numId, fetchProperty, fetchFiles, fetchPayments, fetchReminders, fetchRepairs]);

  useEffect(() => {
    if (numId && activeTab === 'viewings') {
      fetchViewingRecords(numId);
      fetchViewingSettings(numId);
    }
  }, [numId, activeTab, fetchViewingRecords, fetchViewingSettings]);

  useEffect(() => {
    if (numId && activeTab === 'utilities') {
      fetchUtilityRecords(numId);
    }
  }, [numId, activeTab, fetchUtilityRecords]);

  useEffect(() => {
    if (viewingSettings) {
      setViewingSettingsForm({
        allow_weekday: viewingSettings.allow_weekday,
        allow_weekend: viewingSettings.allow_weekend,
        weekday_start: viewingSettings.weekday_start,
        weekday_end: viewingSettings.weekday_end,
        weekend_start: viewingSettings.weekend_start,
        weekend_end: viewingSettings.weekend_end,
        min_notice_hours: viewingSettings.min_notice_hours,
        extra_rules: viewingSettings.extra_rules,
      });
    }
  }, [viewingSettings]);

  const resetViewingForm = useCallback(() => {
    setViewingForm({
      viewing_date: '',
      viewing_time: '',
      agent_name: '',
      agent_phone: '',
      note: '',
      status: 'scheduled',
    });
    setShowAddViewing(false);
    setEditingViewingId(null);
  }, []);

  const handleAddViewing = async () => {
    if (!viewingForm.viewing_date || !viewingForm.viewing_time) return;
    if (editingViewingId) {
      await updateViewingRecord(editingViewingId, { ...viewingForm });
    } else {
      await createViewingRecord(numId, { ...viewingForm });
    }
    resetViewingForm();
  };

  const handleEditViewing = (record: ViewingRecord) => {
    setEditingViewingId(record.id);
    setViewingForm({
      viewing_date: record.viewing_date,
      viewing_time: record.viewing_time,
      agent_name: record.agent_name || '',
      agent_phone: record.agent_phone || '',
      note: record.note || '',
      status: record.status,
    });
    setShowAddViewing(true);
  };

  const handleSaveViewingSettings = async () => {
    await saveViewingSettings(numId, viewingSettingsForm);
    setShowViewingSettings(false);
  };

  const resetUtilityForm = useCallback(() => {
    setUtilityForm({
      type: 'water',
      record_type: 'check_in',
      reading: '',
      unit: '',
      record_date: '',
      note: '',
    });
    setShowAddUtility(false);
    setEditingUtilityId(null);
  }, []);

  const handleAddUtility = async () => {
    if (!utilityForm.record_date || !utilityForm.reading) return;
    if (editingUtilityId) {
      await updateUtilityRecord(editingUtilityId, {
        type: utilityForm.type,
        record_type: utilityForm.record_type,
        reading: Number(utilityForm.reading),
        unit: utilityForm.unit,
        record_date: utilityForm.record_date,
        note: utilityForm.note,
      });
    } else {
      await createUtilityRecord(numId, {
        type: utilityForm.type,
        record_type: utilityForm.record_type,
        reading: Number(utilityForm.reading),
        unit: utilityForm.unit,
        record_date: utilityForm.record_date,
        note: utilityForm.note,
      });
    }
    resetUtilityForm();
  };

  const handleEditUtility = (record: UtilityRecord) => {
    setEditingUtilityId(record.id);
    setUtilityForm({
      type: record.type,
      record_type: record.record_type,
      reading: String(record.reading),
      unit: record.unit || '',
      record_date: record.record_date,
      note: record.note || '',
    });
    setShowAddUtility(true);
  };

  const handleUtilityPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, recordId: number) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingPhotoForRecord(recordId);
      uploadUtilityPhoto(recordId, file).finally(() => {
        setUploadingPhotoForRecord(null);
      });
    }
    if (utilityPhotoInputRef.current) utilityPhotoInputRef.current.value = '';
  };

  const daysUntilContractEnd = () => {
    if (!property) return null;
    const end = new Date(property.contract_end);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const viewingStatusLabel: Record<ViewingRecord['status'], string> = {
    scheduled: '已预约',
    completed: '已完成',
    cancelled: '已取消',
  };

  const viewingStatusColor: Record<ViewingRecord['status'], string> = {
    scheduled: 'bg-[var(--color-accent-light)]/30 text-[var(--color-accent)]',
    completed: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  const property = selectedProperty as Property | null;
  const propertyReminders = reminders.filter((r) => r.property_id === numId);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && numId) uploadFile(numId, file);
    },
    [numId, uploadFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && numId) uploadFile(numId, file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddPayment = async () => {
    if (!paymentForm.payment_date || !paymentForm.amount) return;
    await createPayment(numId, {
      payment_date: paymentForm.payment_date,
      amount: Number(paymentForm.amount),
      note: paymentForm.note,
    });
    setPaymentForm({ payment_date: '', amount: '', note: '' });
    setShowAddPayment(false);
  };

  const resetRepairForm = () => {
    setRepairForm({ repair_date: '', description: '', result: '', cost: '', landlord_borne: false });
    setShowAddRepair(false);
    setEditingRepairId(null);
  };

  const handleAddRepair = async () => {
    if (!repairForm.repair_date || !repairForm.description) return;
    if (editingRepairId) {
      await updateRepair(editingRepairId, {
        repair_date: repairForm.repair_date,
        description: repairForm.description,
        result: repairForm.result,
        cost: Number(repairForm.cost) || 0,
        landlord_borne: repairForm.landlord_borne,
      });
    } else {
      await createRepair(numId, {
        repair_date: repairForm.repair_date,
        description: repairForm.description,
        result: repairForm.result,
        cost: Number(repairForm.cost) || 0,
        landlord_borne: repairForm.landlord_borne,
      });
    }
    resetRepairForm();
  };

  const handleEditRepair = (repair: typeof repairs[0]) => {
    setEditingRepairId(repair.id);
    setRepairForm({
      repair_date: repair.repair_date,
      description: repair.description,
      result: repair.result || '',
      cost: String(repair.cost),
      landlord_borne: !!repair.landlord_borne,
    });
    setShowAddRepair(true);
  };

  if (!property) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  const infoItems = [
    { label: '房屋地址', value: property.address, icon: Building2 },
    { label: '房东姓名', value: property.landlord_name, icon: User },
    { label: '房东电话', value: property.landlord_phone, icon: Phone },
    { label: '中介联系方式', value: property.agent_contact || '-', icon: Phone },
    { label: '月租金', value: `¥${property.rent_amount.toLocaleString()}`, icon: DollarSign },
    { label: '付款周期', value: cycleLabels[property.payment_cycle], icon: Calendar },
    { label: '押金', value: `¥${property.deposit_amount.toLocaleString()}`, icon: DollarSign },
    { label: '合同开始', value: new Date(property.contract_start).toLocaleDateString('zh-CN'), icon: Calendar },
    { label: '合同结束', value: new Date(property.contract_end).toLocaleDateString('zh-CN'), icon: Calendar },
  ];

  const reminderNodes = [
    { type: '45_days' as const, label: '45天提醒', days: 45 },
    { type: '30_days' as const, label: '30天提醒', days: 30 },
    { type: '15_days' as const, label: '15天提醒', days: 15 },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-[var(--color-primary)] line-clamp-1" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          {property.address}
        </h1>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-[var(--color-surface)] p-1 border border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="rounded-lg bg-[var(--color-surface)] p-6 border border-[var(--color-border)]">
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setFormOpen(true)}
              className="btn-shadow inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-light)]"
            >
              <Edit className="h-4 w-4" />
              编辑
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {infoItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{item.label}</p>
                    <p className="font-medium text-[var(--color-text)]">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={async () => {
                if (confirm('确定删除此房屋？删除后不可恢复。')) {
                  await deleteProperty(numId);
                  navigate('/');
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-danger)] px-4 py-2 text-sm font-medium text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-light)]/20"
            >
              <Trash2 className="h-4 w-4" />
              删除房屋
            </button>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragOver
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
            }`}
          >
            <Upload className="mx-auto mb-3 h-10 w-10 text-[var(--color-text-secondary)]" />
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              拖拽文件到此处或点击上传
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">支持图片和PDF文件</p>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileSelect} />
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {files.map((file) => (
                <div key={file.id} className="btn-shadow group relative rounded-lg bg-[var(--color-surface)] p-3 border border-[var(--color-border)]">
                  {file.file_type === 'image' ? (
                    <div className="mb-2 flex h-28 items-center justify-center overflow-hidden rounded-md bg-gray-50">
                      <img
                        src={`/api/files/${file.id}/download`}
                        alt={file.original_name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mb-2 flex h-28 items-center justify-center rounded-md bg-gray-50">
                      <FileText className="h-12 w-12 text-[var(--color-danger)]" />
                    </div>
                  )}
                  <p className="truncate text-sm text-[var(--color-text)]">{file.original_name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {(file.file_size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                    className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-[var(--color-danger-light)]/30"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddPayment(!showAddPayment)}
              className="btn-shadow inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-light)]"
            >
              <Plus className="h-4 w-4" />
              添加记录
            </button>
          </div>

          {showAddPayment && (
            <div className="rounded-lg bg-[var(--color-surface)] p-4 border border-[var(--color-border)]">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">支付日期</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">金额 (元)</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    placeholder="支付金额"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">备注</label>
                  <input
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, note: e.target.value }))}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    placeholder="选填"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddPayment}
                    className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-light)]"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => { setShowAddPayment(false); setPaymentForm({ payment_date: '', amount: '', note: '' }); }}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {payments.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <DollarSign className="mb-3 h-12 w-12 text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">暂无支付记录</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-border)]" />
              <div className="space-y-4">
                {[...payments].sort((a, b) => b.payment_date.localeCompare(a.payment_date)).map((payment) => (
                  <div key={payment.id} className="relative pl-10">
                    <div className="absolute left-3 top-3 h-3 w-3 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-surface)]" />
                    <div className="btn-shadow rounded-lg bg-[var(--color-surface)] p-4 border border-[var(--color-border)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-[var(--color-text)]">¥{payment.amount.toLocaleString()}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {new Date(payment.payment_date).toLocaleDateString('zh-CN')}
                          </p>
                          {payment.note && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{payment.note}</p>}
                        </div>
                        <button
                          onClick={() => deletePayment(payment.id)}
                          className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'repairs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { resetRepairForm(); setShowAddRepair(true); }}
              className="btn-shadow inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-light)]"
            >
              <Plus className="h-4 w-4" />
              添加报修
            </button>
            {repairs.length > 0 && (
              <button
                onClick={() => exportRepairs(numId)}
                className="btn-shadow inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-light)]"
              >
                <Download className="h-4 w-4" />
                导出维修记录
              </button>
            )}
          </div>

          {showAddRepair && (
            <div className="rounded-lg bg-[var(--color-surface)] p-4 border border-[var(--color-border)]">
              <h3 className="mb-3 text-sm font-medium text-[var(--color-text)]">
                {editingRepairId ? '编辑报修记录' : '新增报修记录'}
              </h3>
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">报修日期</label>
                    <input
                      type="date"
                      value={repairForm.repair_date}
                      onChange={(e) => setRepairForm((p) => ({ ...p, repair_date: e.target.value }))}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">花费金额 (元)</label>
                    <input
                      type="number"
                      value={repairForm.cost}
                      onChange={(e) => setRepairForm((p) => ({ ...p, cost: e.target.value }))}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <input
                      type="checkbox"
                      id="landlord_borne"
                      checked={repairForm.landlord_borne}
                      onChange={(e) => setRepairForm((p) => ({ ...p, landlord_borne: e.target.checked }))}
                      className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                    />
                    <label htmlFor="landlord_borne" className="text-sm text-[var(--color-text)]">应由房东承担</label>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">故障描述</label>
                  <textarea
                    value={repairForm.description}
                    onChange={(e) => setRepairForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] resize-y"
                    rows={2}
                    placeholder="描述故障情况"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">维修结果</label>
                  <input
                    value={repairForm.result}
                    onChange={(e) => setRepairForm((p) => ({ ...p, result: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    placeholder="选填，如：已修复、等待处理等"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddRepair}
                    className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-light)]"
                  >
                    {editingRepairId ? '更新' : '保存'}
                  </button>
                  <button
                    onClick={resetRepairForm}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {repairs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Wrench className="mb-3 h-12 w-12 text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">暂无维修报修记录</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">记录每次报修，退租时可导出作为房屋维护证明</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-border)]" />
              <div className="space-y-4">
                {[...repairs].sort((a, b) => b.repair_date.localeCompare(a.repair_date)).map((repair) => (
                  <div key={repair.id} className="relative pl-10">
                    <div className={`absolute left-3 top-3 h-3 w-3 rounded-full border-2 ${
                      repair.result ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                    }`} />
                    <div className="btn-shadow rounded-lg bg-[var(--color-surface)] p-4 border border-[var(--color-border)]">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[var(--color-text)]">{repair.description}</p>
                            {repair.landlord_borne && (
                              <span className="rounded-full bg-[var(--color-accent-light)]/30 px-2 py-0.5 text-xs text-[var(--color-accent)]">房东承担</span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {new Date(repair.repair_date).toLocaleDateString('zh-CN')}
                          </p>
                          {repair.result && (
                            <div className="mt-2 flex items-start gap-1.5">
                              <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                              <p className="text-sm text-[var(--color-text-secondary)]">{repair.result}</p>
                            </div>
                          )}
                          {repair.cost > 0 && (
                            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
                              花费：¥{repair.cost.toLocaleString()}
                              {repair.landlord_borne && <span className="text-[var(--color-accent)]">（房东承担）</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditRepair(repair)}
                            className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteRepair(repair.id)}
                            className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {repairs.length > 0 && (
            <div className="rounded-lg bg-[var(--color-surface)] p-4 border border-[var(--color-border)]">
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">费用汇总</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-[var(--color-text)]">¥{repairs.reduce((s, r) => s + (r.cost || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">总花费</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--color-accent)]">¥{repairs.filter((r) => r.landlord_borne).reduce((s, r) => s + (r.cost || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">房东承担</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--color-primary)]">¥{(repairs.reduce((s, r) => s + (r.cost || 0), 0) - repairs.filter((r) => r.landlord_borne).reduce((s, r) => s + (r.cost || 0), 0)).toLocaleString()}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">租客承担</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="rounded-lg bg-[var(--color-surface)] p-6 border border-[var(--color-border)]">
          <div className="relative ml-4">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-[var(--color-border)]" />
            <div className="space-y-8">
              {reminderNodes.map((node) => {
                const reminder = propertyReminders.find((r) => r.reminder_type === node.type);
                const triggered = reminder?.is_triggered ?? false;
                const handled = reminder?.is_handled ?? false;
                const reminderDate = new Date(property.contract_end);
                reminderDate.setDate(reminderDate.getDate() - node.days);

                return (
                  <div key={node.type} className="relative pl-8">
                    <div
                      className={`absolute left-[-5px] top-1 h-3 w-3 rounded-full border-2 ${
                        handled
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                          : triggered
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[var(--color-text)]">{node.label}</p>
                        {handled && (
                          <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs text-[var(--color-primary)]">已处理</span>
                        )}
                        {triggered && !handled && (
                          <span className="rounded-full bg-[var(--color-accent-light)]/30 px-2 py-0.5 text-xs text-[var(--color-accent)]">已触发</span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        提醒日期：{reminderDate.toLocaleDateString('zh-CN')}
                      </p>
                      {reminder && triggered && !handled && (
                        <button
                          onClick={() => handleReminder(reminder.id)}
                          className="mt-2 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-light)]"
                        >
                          标记已处理
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'viewings' && (
        <div className="space-y-4">
          {(() => {
            const daysLeft = daysUntilContractEnd();
            return (
              <div className={`rounded-lg p-4 border ${
                viewingCanRecord
                  ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start gap-3">
                  {viewingCanRecord ? (
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                  ) : (
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                  )}
                  <div className="flex-1">
                    {viewingCanRecord ? (
                      <>
                        <p className="font-medium text-[var(--color-text)]">
                          合同到期倒计时：{daysLeft} 天
                        </p>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                          您现在可以记录中介看房预约，避免频繁被打扰。合同到期日期：{new Date(property.contract_end).toLocaleDateString('zh-CN')}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-[var(--color-text)]">
                          {daysLeft !== null && daysLeft < 0 ? '合同已到期' : `距合同到期还有 ${daysLeft} 天`}
                        </p>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                          仅在合同到期前 30 天内可记录看房预约。合同到期日期：{new Date(property.contract_end).toLocaleDateString('zh-CN')}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { resetViewingForm(); setShowViewingSettings(false); setShowAddViewing(true); }}
              disabled={!viewingCanRecord}
              className="btn-shadow inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              记录看房
            </button>
            <button
              type="button"
              onClick={() => { resetViewingForm(); setShowAddViewing(false); setShowViewingSettings(!showViewingSettings); }}
              className="btn-shadow inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)]/50"
            >
              <Settings className="h-4 w-4" />
              看房时间段设置
            </button>
            <button
              type="button"
              onClick={() => exportViewingRules(numId)}
              className="btn-shadow inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-light)]"
            >
              <Download className="h-4 w-4" />
              生成预约规则
            </button>
          </div>

          {showViewingSettings && (
            <div className="rounded-lg bg-[var(--color-surface)] p-5 border border-[var(--color-border)]">
              <h3 className="mb-4 text-base font-medium text-[var(--color-text)]">允许看房时间段设置</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={viewingSettingsForm.allow_weekday}
                      onChange={(e) => setViewingSettingsForm((s) => ({ ...s, allow_weekday: e.target.checked }))}
                      className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-text)]">允许工作日看房</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={viewingSettingsForm.allow_weekend}
                      onChange={(e) => setViewingSettingsForm((s) => ({ ...s, allow_weekend: e.target.checked }))}
                      className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--color-text)]">允许周末看房</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2 text-sm text-[var(--color-text-secondary)]">工作日时间段</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={viewingSettingsForm.weekday_start}
                        onChange={(e) => setViewingSettingsForm((s) => ({ ...s, weekday_start: e.target.value }))}
                        disabled={!viewingSettingsForm.allow_weekday}
                        className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] disabled:bg-gray-100 disabled:opacity-60"
                      />
                      <span className="text-sm text-[var(--color-text-secondary)]">至</span>
                      <input
                        type="time"
                        value={viewingSettingsForm.weekday_end}
                        onChange={(e) => setViewingSettingsForm((s) => ({ ...s, weekday_end: e.target.value }))}
                        disabled={!viewingSettingsForm.allow_weekday}
                        className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] disabled:bg-gray-100 disabled:opacity-60"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-[var(--color-text-secondary)]">周末时间段</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={viewingSettingsForm.weekend_start}
                        onChange={(e) => setViewingSettingsForm((s) => ({ ...s, weekend_start: e.target.value }))}
                        disabled={!viewingSettingsForm.allow_weekend}
                        className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] disabled:bg-gray-100 disabled:opacity-60"
                      />
                      <span className="text-sm text-[var(--color-text-secondary)]">至</span>
                      <input
                        type="time"
                        value={viewingSettingsForm.weekend_end}
                        onChange={(e) => setViewingSettingsForm((s) => ({ ...s, weekend_end: e.target.value }))}
                        disabled={!viewingSettingsForm.allow_weekend}
                        className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] disabled:bg-gray-100 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">最少提前预约时间（小时）</label>
                  <select
                    value={viewingSettingsForm.min_notice_hours}
                    onChange={(e) => setViewingSettingsForm((s) => ({ ...s, min_notice_hours: Number(e.target.value) }))}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value={2}>2 小时</option>
                    <option value={4}>4 小时</option>
                    <option value={6}>6 小时</option>
                    <option value={12}>12 小时</option>
                    <option value={24}>24 小时</option>
                    <option value={48}>48 小时</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">其他说明（可选）</label>
                  <textarea
                    value={viewingSettingsForm.extra_rules}
                    onChange={(e) => setViewingSettingsForm((s) => ({ ...s, extra_rules: e.target.value }))}
                    rows={2}
                    placeholder="例如：看房请穿鞋套、请提前打电话确认等"
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] resize-y"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveViewingSettings}
                    className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-light)]"
                  >
                    保存设置
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowViewingSettings(false)}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAddViewing && (
            <div className="rounded-lg bg-[var(--color-surface)] p-5 border border-[var(--color-border)]">
              <h3 className="mb-4 text-base font-medium text-[var(--color-text)]">
                {editingViewingId ? '编辑看房记录' : '新增看房记录'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">看房日期 *</label>
                    <input
                      type="date"
                      value={viewingForm.viewing_date}
                      onChange={(e) => setViewingForm((v) => ({ ...v, viewing_date: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">看房时间 *</label>
                    <input
                      type="time"
                      value={viewingForm.viewing_time}
                      onChange={(e) => setViewingForm((v) => ({ ...v, viewing_time: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">中介姓名</label>
                    <input
                      value={viewingForm.agent_name}
                      onChange={(e) => setViewingForm((v) => ({ ...v, agent_name: e.target.value }))}
                      placeholder="选填"
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">中介电话</label>
                    <input
                      value={viewingForm.agent_phone}
                      onChange={(e) => setViewingForm((v) => ({ ...v, agent_phone: e.target.value }))}
                      placeholder="选填"
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">状态</label>
                    <select
                      value={viewingForm.status}
                      onChange={(e) => setViewingForm((v) => ({ ...v, status: e.target.value as ViewingRecord['status'] }))}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="scheduled">已预约</option>
                      <option value="completed">已完成</option>
                      <option value="cancelled">已取消</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">备注</label>
                  <input
                    value={viewingForm.note}
                    onChange={(e) => setViewingForm((v) => ({ ...v, note: e.target.value }))}
                    placeholder="选填，如：几个人看房、是否有租客在家等"
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAddViewing}
                    className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-light)]"
                  >
                    {editingViewingId ? '更新' : '保存'}
                  </button>
                  <button
                    type="button"
                    onClick={resetViewingForm}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewingRecords.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Eye className="mb-3 h-14 w-14 text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">暂无看房记录</p>
              {viewingCanRecord && (
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  点击上方"记录看房"按钮，记录每次中介带看预约
                </p>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-border)]" />
              <div className="space-y-4">
                {[...viewingRecords].sort((a, b) =>
                  (b.viewing_date + b.viewing_time).localeCompare(a.viewing_date + a.viewing_time)
                ).map((record) => (
                  <div key={record.id} className="relative pl-10">
                    <div className={`absolute left-3 top-3 h-3 w-3 rounded-full border-2 ${
                      record.status === 'completed'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                        : record.status === 'cancelled'
                        ? 'border-gray-300 bg-gray-300'
                        : 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                    }`} />
                    <div className="btn-shadow rounded-lg bg-[var(--color-surface)] p-4 border border-[var(--color-border)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <p className="font-medium text-[var(--color-text)]">
                              {new Date(record.viewing_date).toLocaleDateString('zh-CN')} {record.viewing_time}
                            </p>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${viewingStatusColor[record.status]}`}>
                              {viewingStatusLabel[record.status]}
                            </span>
                          </div>
                          {(record.agent_name || record.agent_phone) && (
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {record.agent_name || '未填写姓名'}
                              {record.agent_phone && ` · ${record.agent_phone}`}
                            </p>
                          )}
                          {record.note && (
                            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{record.note}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleEditViewing(record)}
                            className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteViewingRecord(record.id)}
                            className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewingRecords.length > 0 && (
            <div className="rounded-lg bg-[var(--color-surface)] p-4 border border-[var(--color-border)]">
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">统计汇总</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-[var(--color-accent)]">
                    {viewingRecords.filter((r) => r.status === 'scheduled').length}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">待看房</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {viewingRecords.filter((r) => r.status === 'completed').length}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">已完成</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-500">
                    {viewingRecords.filter((r) => r.status === 'cancelled').length}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">已取消</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'utilities' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { resetUtilityForm(); setShowAddUtility(true); }}
              className="btn-shadow inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-light)]"
            >
              <Plus className="h-4 w-4" />
              记录读数
            </button>
            <button
              type="button"
              onClick={() => exportHandoverForm(numId)}
              className="btn-shadow inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-light)]"
            >
              <Download className="h-4 w-4" />
              生成交接确认单
            </button>
          </div>

          {showAddUtility && (
            <div className="rounded-lg bg-[var(--color-surface)] p-5 border border-[var(--color-border)]">
              <h3 className="mb-4 text-base font-medium text-[var(--color-text)]">
                {editingUtilityId ? '编辑水电煤记录' : '新增水电煤记录'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">记录类型 *</label>
                    <select
                      value={utilityForm.record_type}
                      onChange={(e) => setUtilityForm((u) => ({ ...u, record_type: e.target.value as UtilityRecord['record_type'] }))}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="check_in">入住</option>
                      <option value="check_out">退租</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">表类型 *</label>
                    <select
                      value={utilityForm.type}
                      onChange={(e) => setUtilityForm((u) => ({ ...u, type: e.target.value as UtilityRecord['type'] }))}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="water">水表</option>
                      <option value="electricity">电表</option>
                      <option value="gas">燃气表</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">记录日期 *</label>
                    <input
                      type="date"
                      value={utilityForm.record_date}
                      onChange={(e) => setUtilityForm((u) => ({ ...u, record_date: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">读数 *</label>
                    <input
                      type="number"
                      value={utilityForm.reading}
                      onChange={(e) => setUtilityForm((u) => ({ ...u, reading: e.target.value }))}
                      placeholder="请输入读数"
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">单位</label>
                    <input
                      value={utilityForm.unit}
                      onChange={(e) => setUtilityForm((u) => ({ ...u, unit: e.target.value }))}
                      placeholder="如：吨、度、m³"
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">备注</label>
                  <textarea
                    value={utilityForm.note}
                    onChange={(e) => setUtilityForm((u) => ({ ...u, note: e.target.value }))}
                    rows={2}
                    placeholder="选填，如：表号、异常情况等"
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] resize-y"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAddUtility}
                    className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-light)]"
                  >
                    {editingUtilityId ? '更新' : '保存'}
                  </button>
                  <button
                    type="button"
                    onClick={resetUtilityForm}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['water', 'electricity', 'gas'] as const).map((type) => {
              const typeRecords = utilityRecords.filter((r) => r.type === type);
              const checkInRecord = typeRecords.find((r) => r.record_type === 'check_in');
              const checkOutRecord = typeRecords.find((r) => r.record_type === 'check_out');
              const typeIcons = { water: Droplets, electricity: Zap, gas: Flame };
              const typeLabels = { water: '水表', electricity: '电表', gas: '燃气表' };
              const typeColors = {
                water: 'text-blue-500 bg-blue-50',
                electricity: 'text-yellow-500 bg-yellow-50',
                gas: 'text-orange-500 bg-orange-50',
              };
              const Icon = typeIcons[type];

              return (
                <div key={type} className="rounded-lg bg-[var(--color-surface)] p-4 border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-lg ${typeColors[type]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-medium text-[var(--color-text)]">{typeLabels[type]}</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">入住读数：</span>
                      <span className="font-medium">
                        {checkInRecord ? `${checkInRecord.reading.toLocaleString()} ${checkInRecord.unit || ''}` : '未记录'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">退租读数：</span>
                      <span className="font-medium">
                        {checkOutRecord ? `${checkOutRecord.reading.toLocaleString()} ${checkOutRecord.unit || ''}` : '未记录'}
                      </span>
                    </div>
                    {checkInRecord && checkOutRecord && (
                      <div className="flex justify-between pt-2 border-t border-[var(--color-border)]">
                        <span className="text-[var(--color-text-secondary)]">用量：</span>
                        <span className="font-bold text-[var(--color-accent)]">
                          {(checkOutRecord.reading - checkInRecord.reading).toLocaleString()} {checkInRecord.unit || ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {utilityRecords.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Droplets className="mb-3 h-14 w-14 text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">暂无水电煤读数记录</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                入住和退租时记录水电煤表读数，生成交接确认单，避免押金纠纷
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-border)]" />
              <div className="space-y-4">
                {[...utilityRecords].sort((a, b) => b.record_date.localeCompare(a.record_date)).map((record) => {
                  const typeIcons = { water: Droplets, electricity: Zap, gas: Flame };
                  const typeLabels = { water: '水表', electricity: '电表', gas: '燃气表' };
                  const recordTypeLabels = { check_in: '入住', check_out: '退租' };
                  const recordTypeColors = {
                    check_in: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
                    check_out: 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]',
                  };
                  const Icon = typeIcons[record.type];

                  return (
                    <div key={record.id} className="relative pl-10">
                      <div className="absolute left-3 top-3 h-3 w-3 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-surface)]" />
                      <div className="btn-shadow rounded-lg bg-[var(--color-surface)] p-4 border border-[var(--color-border)]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                              <p className="font-medium text-[var(--color-text)]">
                                {typeLabels[record.type]} - {recordTypeLabels[record.record_type]}
                              </p>
                              <span className={`rounded-full px-2 py-0.5 text-xs ${recordTypeColors[record.record_type]}`}>
                                {recordTypeLabels[record.record_type]}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {new Date(record.record_date).toLocaleDateString('zh-CN')}
                            </p>
                            <p className="mt-2 text-lg font-bold text-[var(--color-primary)]">
                              {record.reading.toLocaleString()}
                              <span className="text-sm font-normal text-[var(--color-text-secondary)] ml-1">
                                {record.unit || ''}
                              </span>
                            </p>
                            {record.note && (
                              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                                备注：{record.note}
                              </p>
                            )}

                            {record.photos && record.photos.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-[var(--color-text-secondary)] mb-2">照片存档：</p>
                                <div className="flex flex-wrap gap-2">
                                  {record.photos.map((photo) => (
                                    <div key={photo.id} className="relative group">
                                      <img
                                        src={`/api/properties/utility-photos/${photo.id}/download`}
                                        alt={photo.original_name}
                                        className="h-16 w-16 object-cover rounded-md border border-[var(--color-border)]"
                                      />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deleteUtilityPhoto(photo.id); }}
                                        className="absolute -top-1 -right-1 rounded-full bg-white p-0.5 opacity-0 group-hover:opacity-100 shadow transition-opacity hover:bg-[var(--color-danger-light)]/30"
                                      >
                                        <X className="h-3 w-3 text-[var(--color-danger)]" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-3">
                              <input
                                ref={utilityPhotoInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleUtilityPhotoSelect(e, record.id)}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadingPhotoForRecord(record.id);
                                  utilityPhotoInputRef.current?.click();
                                }}
                                disabled={uploadingPhotoForRecord === record.id}
                                className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-light)] disabled:opacity-50"
                              >
                                <Image className="h-3.5 w-3.5" />
                                {uploadingPhotoForRecord === record.id ? '上传中...' : '添加照片'}
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => handleEditUtility(record)}
                              className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteUtilityRecord(record.id)}
                              className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <PropertyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        property={property}
        onSubmit={async (data) => {
          await updateProperty(numId, data);
        }}
      />
    </div>
  );
}
