import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Property } from '@/stores/propertyStore';

interface PropertyFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  property?: Property | null;
}

const cycleOptions = [
  { value: 'monthly', label: '月付' },
  { value: 'quarterly', label: '季付' },
  { value: 'semi_annual', label: '半年付' },
  { value: 'annual', label: '年付' },
];

const emptyForm = {
  address: '',
  landlord_name: '',
  landlord_phone: '',
  agent_contact: '',
  rent_amount: '',
  payment_cycle: 'monthly',
  deposit_amount: '',
  contract_start: '',
  contract_end: '',
};

export default function PropertyForm({ open, onClose, onSubmit, property }: PropertyFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (property) {
      setForm({
        address: property.address,
        landlord_name: property.landlord_name,
        landlord_phone: property.landlord_phone,
        agent_contact: property.agent_contact || '',
        rent_amount: String(property.rent_amount),
        payment_cycle: property.payment_cycle,
        deposit_amount: String(property.deposit_amount),
        contract_start: property.contract_start,
        contract_end: property.contract_end,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [property, open]);

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.address.trim()) e.address = '请输入房屋地址';
    if (!form.landlord_name.trim()) e.landlord_name = '请输入房东姓名';
    if (!form.landlord_phone.trim()) e.landlord_phone = '请输入房东电话';
    if (!form.rent_amount || Number(form.rent_amount) <= 0) e.rent_amount = '请输入有效租金';
    if (!form.contract_start) e.contract_start = '请选择合同开始日期';
    if (!form.contract_end) e.contract_end = '请选择合同结束日期';
    if (form.contract_start && form.contract_end && form.contract_end <= form.contract_start) {
      e.contract_end = '结束日期必须晚于开始日期';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        address: form.address.trim(),
        landlord_name: form.landlord_name.trim(),
        landlord_phone: form.landlord_phone.trim(),
        agent_contact: form.agent_contact.trim(),
        rent_amount: Number(form.rent_amount),
        payment_cycle: form.payment_cycle,
        deposit_amount: Number(form.deposit_amount) || 0,
        contract_start: form.contract_start,
        contract_end: form.contract_end,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--color-surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-primary)]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            {property ? '编辑房屋' : '新增房屋'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-primary)]">基本信息</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">房屋地址 *</label>
                <input
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-primary)] ${
                    errors.address ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                  }`}
                  placeholder="请输入房屋地址"
                />
                {errors.address && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.address}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">房东姓名 *</label>
                  <input
                    value={form.landlord_name}
                    onChange={(e) => update('landlord_name', e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-primary)] ${
                      errors.landlord_name ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                    }`}
                    placeholder="房东姓名"
                  />
                  {errors.landlord_name && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.landlord_name}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">房东电话 *</label>
                  <input
                    value={form.landlord_phone}
                    onChange={(e) => update('landlord_phone', e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-primary)] ${
                      errors.landlord_phone ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                    }`}
                    placeholder="房东电话"
                  />
                  {errors.landlord_phone && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.landlord_phone}</p>}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">中介联系方式</label>
                <input
                  value={form.agent_contact}
                  onChange={(e) => update('agent_contact', e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                  placeholder="选填"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-primary)]">租赁信息</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">月租金 (元) *</label>
                <input
                  type="number"
                  value={form.rent_amount}
                  onChange={(e) => update('rent_amount', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-primary)] ${
                    errors.rent_amount ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                  }`}
                  placeholder="月租金"
                />
                {errors.rent_amount && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.rent_amount}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">付款周期</label>
                <select
                  value={form.payment_cycle}
                  onChange={(e) => update('payment_cycle', e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                >
                  {cycleOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">押金 (元)</label>
                <input
                  type="number"
                  value={form.deposit_amount}
                  onChange={(e) => update('deposit_amount', e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                  placeholder="押金金额"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-primary)]">合同信息</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">合同开始日期 *</label>
                <input
                  type="date"
                  value={form.contract_start}
                  onChange={(e) => update('contract_start', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-primary)] ${
                    errors.contract_start ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                  }`}
                />
                {errors.contract_start && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.contract_start}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">合同结束日期 *</label>
                <input
                  type="date"
                  value={form.contract_end}
                  onChange={(e) => update('contract_end', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-primary)] ${
                    errors.contract_end ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                  }`}
                />
                {errors.contract_end && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.contract_end}</p>}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-shadow rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
