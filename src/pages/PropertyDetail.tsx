import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Upload, Trash2, Image, FileText, Clock, Plus, X, User, Phone, DollarSign, Calendar, Building2 } from 'lucide-react';
import { usePropertyStore } from '@/stores/propertyStore';
import PropertyForm from '@/components/PropertyForm';
import type { Property } from '@/stores/propertyStore';

const cycleLabels: Record<string, string> = {
  monthly: '月付',
  quarterly: '季付',
  semi_annual: '半年付',
  annual: '年付',
};

type TabKey = 'info' | 'files' | 'payments' | 'reminders';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'info', label: '基本信息' },
  { key: 'files', label: '合同文件' },
  { key: 'payments', label: '支付记录' },
  { key: 'reminders', label: '到期提醒' },
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
    fetchProperty,
    fetchFiles,
    fetchPayments,
    fetchReminders,
    updateProperty,
    deleteProperty,
    uploadFile,
    deleteFile,
    createPayment,
    deletePayment,
    handleReminder,
  } = usePropertyStore();

  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ payment_date: '', amount: '', note: '' });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (numId) {
      fetchProperty(numId);
      fetchFiles(numId);
      fetchPayments(numId);
      fetchReminders();
    }
  }, [numId, fetchProperty, fetchFiles, fetchPayments, fetchReminders]);

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
