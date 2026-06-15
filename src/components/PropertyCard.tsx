import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign } from 'lucide-react';
import type { Property } from '@/stores/propertyStore';

function getDaysRemaining(contractEnd: string): number {
  const end = new Date(contractEnd);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusColor(days: number): string {
  if (days < 0) return 'bg-gray-400';
  if (days < 15) return 'bg-[var(--color-danger)]';
  if (days <= 45) return 'bg-[var(--color-accent)]';
  return 'bg-[var(--color-primary)]';
}

function getStatusLabel(days: number): string {
  if (days < 0) return '已过期';
  if (days < 15) return '紧急';
  if (days <= 45) return '即将到期';
  return '安全';
}

function getStatusBadgeBg(days: number): string {
  if (days < 0) return 'bg-gray-100 text-gray-600';
  if (days < 15) return 'bg-[var(--color-danger-light)]/30 text-[var(--color-danger)]';
  if (days <= 45) return 'bg-[var(--color-accent-light)]/30 text-[var(--color-accent)]';
  return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]';
}

const cycleLabels: Record<string, string> = {
  monthly: '月付',
  quarterly: '季付',
  semi_annual: '半年付',
  annual: '年付',
};

export default function PropertyCard({ property }: { property: Property }) {
  const navigate = useNavigate();
  const days = getDaysRemaining(property.contract_end);
  const statusColor = getStatusColor(days);
  const statusLabel = getStatusLabel(days);
  const badgeBg = getStatusBadgeBg(days);

  return (
    <div
      onClick={() => navigate(`/property/${property.id}`)}
      className="btn-shadow cursor-pointer overflow-hidden rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
    >
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${statusColor}`} />
        <div className="flex-1 p-5">
          <div className="mb-3 flex items-start justify-between">
            <h3 className="text-base font-semibold text-[var(--color-text)] line-clamp-1">
              {property.address}
            </h3>
            <span className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeBg}`}>
              {statusLabel}
            </span>
          </div>

          <div className="mb-3 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <DollarSign className="h-4 w-4" />
            <span>¥{property.rent_amount.toLocaleString()}/月</span>
            <span className="text-[var(--color-border)]">|</span>
            <span>{cycleLabels[property.payment_cycle]}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(property.contract_start).toLocaleDateString('zh-CN')} ~{' '}
              {new Date(property.contract_end).toLocaleDateString('zh-CN')}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
            <span className="text-sm text-[var(--color-text-secondary)]">剩余天数</span>
            <span
              className={`text-lg font-bold ${
                days < 0
                  ? 'text-gray-400'
                  : days < 15
                  ? 'text-[var(--color-danger)]'
                  : days <= 45
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-primary)]'
              }`}
            >
              {days < 0 ? '已过期' : `${days}天`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { getDaysRemaining };
