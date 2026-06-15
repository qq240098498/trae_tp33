import { useEffect } from 'react';
import { Bell, Check, AlertTriangle, Clock, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePropertyStore } from '@/stores/propertyStore';
import type { Reminder } from '@/stores/propertyStore';

function getDaysRemaining(contractEnd: string): number {
  const end = new Date(contractEnd);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const navigate = useNavigate();
  const { handleReminder } = usePropertyStore();
  const days = getDaysRemaining(reminder.contract_end);
  const handled = reminder.is_handled;

  let borderColor = 'border-l-[var(--color-primary)]';
  let urgencyLabel = '';
  let UrgencyIcon = Clock;

  if (days < 0) {
    borderColor = 'border-l-gray-400';
    urgencyLabel = '已过期';
    UrgencyIcon = Clock;
  } else if (days < 15) {
    borderColor = 'border-l-[var(--color-danger)]';
    urgencyLabel = '紧急';
    UrgencyIcon = AlertTriangle;
  } else if (days <= 45) {
    borderColor = 'border-l-[var(--color-accent)]';
    urgencyLabel = '即将到期';
    UrgencyIcon = Bell;
  }

  return (
    <div
      className={`btn-shadow rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 ${borderColor} ${
        handled ? 'opacity-60' : ''
      }`}
    >
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <UrgencyIcon className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">{urgencyLabel}</span>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              days < 0
                ? 'bg-gray-100 text-gray-500'
                : days < 15
                ? 'bg-[var(--color-danger-light)]/30 text-[var(--color-danger)]'
                : 'bg-[var(--color-accent-light)]/30 text-[var(--color-accent)]'
            }`}
          >
            {days < 0 ? '已过期' : `剩余${days}天`}
          </span>
        </div>

        <h3
          className={`mb-2 text-base font-semibold text-[var(--color-text)] ${
            handled ? 'line-through decoration-[var(--color-text-secondary)]' : ''
          }`}
        >
          {reminder.address}
        </h3>

        <p className="text-sm text-[var(--color-text-secondary)]">
          合同到期日：{new Date(reminder.contract_end).toLocaleDateString('zh-CN')}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => navigate(`/property/${reminder.property_id}`)}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            查看详情
          </button>
          {!handled && reminder.is_triggered && (
            <button
              onClick={() => handleReminder(reminder.id)}
              className="btn-shadow inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-light)]"
            >
              <Check className="h-3.5 w-3.5" />
              已处理
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Reminders() {
  const { reminders, fetchReminders, loading } = usePropertyStore();

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const triggeredReminders = reminders.filter((r) => r.is_triggered);

  const urgent = triggeredReminders.filter((r) => {
    const d = getDaysRemaining(r.contract_end);
    return d >= 0 && d < 15;
  });

  const expiring = triggeredReminders.filter((r) => {
    const d = getDaysRemaining(r.contract_end);
    return d >= 15 && d <= 45;
  });

  const expired = triggeredReminders.filter((r) => getDaysRemaining(r.contract_end) < 0);

  const groups: { label: string; items: Reminder[]; icon: typeof AlertTriangle; color: string }[] = [
    { label: '紧急', items: urgent, icon: AlertTriangle, color: 'text-[var(--color-danger)]' },
    { label: '即将到期', items: expiring, icon: Bell, color: 'text-[var(--color-accent)]' },
    { label: '已过期', items: expired, icon: Clock, color: 'text-gray-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-primary)]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
        提醒中心
      </h1>

      {triggeredReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-[var(--color-border)]" />
          <p className="mb-1 text-lg font-medium text-[var(--color-text-secondary)]">暂无提醒</p>
          <p className="text-sm text-[var(--color-text-secondary)]">所有合同状态正常，没有需要关注的提醒</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(
            (group) =>
              group.items.length > 0 && (
                <div key={group.label}>
                  <div className="mb-3 flex items-center gap-2">
                    <group.icon className={`h-5 w-5 ${group.color}`} />
                    <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                      {group.label}
                    </h2>
                    <span className="rounded-full bg-[var(--color-border)]/50 px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {group.items.map((reminder) => (
                      <ReminderCard key={reminder.id} reminder={reminder} />
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}
