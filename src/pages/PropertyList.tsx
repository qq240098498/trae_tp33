import { useEffect, useState } from 'react';
import { Plus, Building2, DollarSign, AlertTriangle, Search } from 'lucide-react';
import { usePropertyStore } from '@/stores/propertyStore';
import PropertyCard from '@/components/PropertyCard';
import PropertyForm from '@/components/PropertyForm';
import { getDaysRemaining } from '@/components/PropertyCard';

export default function PropertyList() {
  const { properties, fetchProperties, createProperty, loading } = usePropertyStore();
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const filtered = properties.filter((p) =>
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = properties.filter((p) => getDaysRemaining(p.contract_end) >= 0).length;
  const monthlyTotal = properties.reduce((sum, p) => sum + p.rent_amount, 0);
  const expiringCount = properties.filter((p) => {
    const d = getDaysRemaining(p.contract_end);
    return d >= 0 && d <= 45;
  }).length;

  const stats = [
    { label: '在租数量', value: activeCount, unit: '套', icon: Building2, color: 'bg-[var(--color-primary)]' },
    { label: '本月应付', value: `¥${monthlyTotal.toLocaleString()}`, unit: '', icon: DollarSign, color: 'bg-[var(--color-accent)]' },
    { label: '即将到期', value: expiringCount, unit: '套', icon: AlertTriangle, color: 'bg-[var(--color-danger)]' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          房屋管理
        </h1>
        <button
          onClick={() => setFormOpen(true)}
          className="btn-shadow inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-light)]"
        >
          <Plus className="h-4 w-4" />
          新增房屋
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="btn-shadow flex items-center gap-4 rounded-lg bg-[var(--color-surface)] p-5 border border-[var(--color-border)]">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${s.color}`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">{s.label}</p>
                <p className="text-xl font-bold text-[var(--color-text)]">
                  {s.value}
                  {s.unit && <span className="ml-1 text-sm font-normal text-[var(--color-text-secondary)]">{s.unit}</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索房屋地址..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--color-primary)] sm:max-w-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-[var(--color-border)]" />
          <p className="mb-1 text-lg font-medium text-[var(--color-text-secondary)]">
            {search ? '未找到匹配的房屋' : '暂无房屋信息'}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {search ? '请尝试其他关键词' : '点击"新增房屋"添加您的第一套租赁信息'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}

      <PropertyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={async (data) => {
          await createProperty(data);
        }}
      />
    </div>
  );
}
