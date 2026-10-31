import React, { useEffect, useMemo } from 'react';
import { ShoppingBag, Sparkles, XCircle } from 'lucide-react';
import { companiesService, companyMetricsService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useStages } from '../hooks/useStages';
import { extractApiErrorMessage } from '../utils/errors';
import { logger } from '../utils/logger';

const ANALYTICS_PAGE_FOOTER = 'Дальше больше' as const;

function formatConversionPct(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '—';
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (Number.isNaN(n)) return '—';
  return `${n.toFixed(2)}%`;
}

export interface AnalyticsProps {
  companyId: number;
}

export const Analytics: React.FC<AnalyticsProps> = ({ companyId }) => {
  const { stages } = useStages(companyId);

  const { data: company } = useAsync(() => companiesService.getById(companyId), [companyId]);

  const {
    data: snapshotsPage,
    isLoading: snapshotsLoading,
    error: snapshotsError,
  } = useAsync(() => companyMetricsService.listSnapshots(companyId), [companyId]);

  useEffect(() => {
    if (!snapshotsError) return;
    logger.error('company metrics snapshots failed', snapshotsError);
  }, [snapshotsError]);

  const metricsTargetDisplay = useMemo(() => {
    if (!company) return '…';
    const sid = company.target_stage_id;
    if (sid == null) return 'Не задана';
    const st = stages.find((s) => s.id === sid);
    return st ? st.name : `Стадия #${sid}`;
  }, [company, stages]);

  const items = snapshotsPage?.items ?? [];
  const latest = items[0];
  const snapshotsErrorMessage = snapshotsError ? extractApiErrorMessage(snapshotsError) : null;

  return (
    <div className="flex h-full w-full bg-sidebar flex-col overflow-hidden">
      <div className="h-[64px] px-8 flex items-center border-b border-gray-200 bg-white flex-shrink-0 z-10">
        <h2 className="text-[15px] font-bold text-gray-900">Аналитика</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8">
        <div className="max-w-[1400px] mx-auto space-y-6 pb-2">
          <div className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="form-label mb-1">Целевая стадия для метрик</div>
              <div className="text-[15px] font-semibold text-gray-900">{metricsTargetDisplay}</div>
            </div>
            <p className="text-[11px] text-gray-500 sm:max-w-md sm:text-right">
              Изменить можно в разделе «Воронка». Конверсия считается как доля заказов, впервые дошедших до
              этой стадии в отчётный день, от заказов с активностью ассистента за тот же день.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SnapshotMetricCard
              label="Заказы с ответами ассистента (день)"
              value={
                snapshotsError
                  ? '—'
                  : snapshotsLoading
                    ? '…'
                    : latest
                      ? String(latest.orders_with_assistant_activity_count)
                      : '—'
              }
              hint={
                snapshotsErrorMessage
                  ? snapshotsErrorMessage
                  : latest
                    ? `Дата отчёта: ${latest.report_date}`
                    : 'Нет сохранённых снимков'
              }
            />
            <SnapshotMetricCard
              label="Впервые достигли цели (день)"
              value={
                snapshotsError
                  ? '—'
                  : snapshotsLoading
                    ? '…'
                    : latest && latest.orders_reached_target_count !== null
                      ? String(latest.orders_reached_target_count)
                      : '—'
              }
              hint={
                snapshotsErrorMessage
                  ? snapshotsErrorMessage
                  : latest?.target_stage_name_snapshot
                    ? `Снимок: «${latest.target_stage_name_snapshot}»`
                    : latest
                      ? 'Название стадии в снимке недоступно'
                      : 'Нет сохранённых снимков'
              }
            />
            <SnapshotMetricCard
              label="Конверсия"
              value={
                snapshotsError ? '—' : snapshotsLoading ? '…' : formatConversionPct(latest?.conversion_pct)
              }
              hint={
                snapshotsErrorMessage
                  ? snapshotsErrorMessage
                  : 'Только при заданной цели и ненулевом знаменателе'
              }
            />
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-[14px] font-bold text-gray-900">История снимков</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase">Дата</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">
                      Ассистент
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">
                      Цель
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">
                      Конверсия
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase">
                      Стадия (снимок)
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase">
                      Расчёт
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {snapshotsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-[13px]">
                        Загрузка…
                      </td>
                    </tr>
                  ) : snapshotsError ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-red-700 text-[13px] leading-relaxed"
                      >
                        Не удалось загрузить историю снимков. {snapshotsErrorMessage}
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-[13px]">
                        Пока нет снимков. Они появятся после фоновой агрегации по дням.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.report_date}>
                        <td className="px-6 py-3 text-[13px] font-medium text-gray-900">{row.report_date}</td>
                        <td className="px-6 py-3 text-right text-[13px] font-mono text-gray-700">
                          {row.orders_with_assistant_activity_count}
                        </td>
                        <td className="px-6 py-3 text-right text-[13px] font-mono text-gray-700">
                          {row.orders_reached_target_count === null ? '—' : row.orders_reached_target_count}
                        </td>
                        <td className="px-6 py-3 text-right text-[13px] font-mono text-gray-700">
                          {formatConversionPct(row.conversion_pct)}
                        </td>
                        <td className="px-6 py-3 text-[13px] text-gray-700">
                          {row.target_stage_name_snapshot ?? '—'}
                        </td>
                        <td className="px-6 py-3 text-[12px] text-gray-500 whitespace-nowrap">
                          {row.computed_at ? new Date(row.computed_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hidden" aria-hidden="true">
            <p className="text-[11px] text-gray-400 text-center">Ниже — демо-виджеты (макет)</p>

            <div className="grid grid-cols-4 gap-6">
            <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[14px] font-bold text-gray-900">Воронка продаж</h3>
                <div className="relative w-[280px]">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Sparkles size={14} className="text-indigo-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Спросить AI о данных..."
                    className="w-full pl-9 pr-3 py-1.5 text-[12px] bg-indigo-50/50 border border-indigo-100 rounded-lg text-indigo-900 placeholder-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200 transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 flex items-end justify-around gap-8 h-[220px] pb-4 border-b border-gray-50 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="h-px bg-gray-50 w-full border-t border-dashed border-gray-100" />
                  <div className="h-px bg-gray-50 w-full border-t border-dashed border-gray-100" />
                  <div className="h-px bg-gray-50 w-full border-t border-dashed border-gray-100" />
                  <div className="h-px bg-gray-50 w-full border-t border-dashed border-gray-100" />
                </div>
                <FunnelBar label="Новые" count={1200} height="h-[100%]" color="bg-gray-200" />
                <ArrowRight />
                <FunnelBar
                  label="Квалификация"
                  count={600}
                  height="h-[50%]"
                  color="bg-gray-300"
                  dropoff="50%"
                />
                <ArrowRight />
                <FunnelBar
                  label="Предложение"
                  count={150}
                  height="h-[15%]"
                  color="bg-gray-400"
                  dropoff="75%"
                />
                <ArrowRight />
                <FunnelBar label="Оплата" count={42} height="h-[5%]" color="bg-gray-900" dropoff="28%" />
              </div>
            </div>

            <div className="col-span-1 bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col">
              <h3 className="text-[14px] font-bold text-gray-900 mb-6 flex items-center gap-2">
                <XCircle size={16} className="text-red-500" />
                Причины отказов
              </h3>
              <div className="flex flex-col gap-6 justify-center h-full">
                <HorizontalBar label="Дорого / Нет бюджета" percent={45} color="bg-red-400" />
                <HorizontalBar label="Не подошло время" percent={30} color="bg-gray-300" />
                <HorizontalBar label="Игнор / Пропал" percent={15} color="bg-gray-200" />
                <HorizontalBar label="Ушли к конкурентам" percent={10} color="bg-gray-200" />
              </div>
            </div>

            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-0 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-[14px] font-bold text-gray-900">Эффективность команды</h3>
              </div>
              <div className="flex-1 p-0">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase">Менеджер</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">
                        Сделок Закрыто
                      </th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">
                        Конверсия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr>
                      <td className="px-6 py-3 flex items-center gap-3">
                        <img
                          src="https://picsum.photos/id/444/100/100"
                          className="w-8 h-8 rounded-full"
                          alt="Olga"
                        />
                        <span className="text-[13px] font-medium text-gray-900">Ольга</span>
                      </td>
                      <td className="px-6 py-3 text-right text-[13px] font-mono text-gray-700">12</td>
                      <td className="px-6 py-3 text-right">
                        <span className="bg-orange-50 text-orange-600 text-[11px] font-bold px-2 py-0.5 rounded-md">
                          18%
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 flex items-center gap-3">
                        <img
                          src="https://picsum.photos/id/1012/100/100"
                          className="w-8 h-8 rounded-full"
                          alt="Dmitry"
                        />
                        <span className="text-[13px] font-medium text-gray-900">Дмитрий</span>
                      </td>
                      <td className="px-6 py-3 text-right text-[13px] font-mono text-gray-700">28</td>
                      <td className="px-6 py-3 text-right">
                        <span className="bg-emerald-50 text-emerald-600 text-[11px] font-bold px-2 py-0.5 rounded-md">
                          45%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-gray-900">Популярные продукты</h3>
                <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                  <ShoppingBag size={14} />
                </div>
              </div>
              <div className="space-y-4">
                <ProductRow rank={1} name="Абонемент Утренний" sales={42} />
                <ProductRow rank={2} name="Персональная тренировка" sales={18} />
                <ProductRow rank={3} name="Детская группа" sales={12} />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <footer className="flex-shrink-0 border-t border-gray-200 bg-gradient-to-b from-white to-indigo-50/40 px-6 md:px-8 py-4 md:py-5">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3 sm:gap-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Sparkles size={18} strokeWidth={2} aria-hidden />
          </div>
          <p className="text-[13px] font-semibold text-gray-900">{ANALYTICS_PAGE_FOOTER}</p>
        </div>
      </footer>
    </div>
  );
};

const SnapshotMetricCard: React.FC<{ label: string; value: string; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col">
    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
    <div className="h-9 flex items-center">
      <div className="text-2xl font-bold tracking-tight text-gray-900 leading-none">{value}</div>
    </div>
    <div className="min-h-[2rem] flex flex-col justify-end text-[10px] text-gray-400 font-medium leading-snug">
      {hint ?? '\u00a0'}
    </div>
  </div>
);

const FunnelBar: React.FC<{
  label: string;
  count: number;
  height: string;
  color: string;
  dropoff?: string;
}> = ({ label, count, height, color, dropoff }) => (
  <div className="flex flex-col items-center justify-end h-full w-[15%] group relative">
    {dropoff ? (
      <div className="absolute -top-6 text-[10px] font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        -{dropoff}
      </div>
    ) : null}
    <div className={`w-full ${height} ${color} rounded-t-md transition-all group-hover:opacity-80 relative min-h-[4px]`} />
    <div className="mt-3 text-center">
      <div className="text-[14px] font-bold text-gray-900">{count}</div>
      <div className="text-[10px] font-medium text-gray-400 uppercase mt-0.5">{label}</div>
    </div>
  </div>
);

const ArrowRight = () => (
  <div className="h-[200px] flex items-center justify-center opacity-20">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 12H19M19 12L12 5M19 12L12 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const HorizontalBar: React.FC<{ label: string; percent: number; color: string }> = ({
  label,
  percent,
  color,
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex justify-between text-[12px] font-medium">
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-900 font-bold">{percent}%</span>
    </div>
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div style={{ width: `${percent}%` }} className={`h-full ${color} rounded-full`} />
    </div>
  </div>
);

const ProductRow: React.FC<{ rank: number; name: string; sales: number }> = ({ rank, name, sales }) => (
  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500">
        {rank}
      </div>
      <span className="text-[13px] font-medium text-gray-900">{name}</span>
    </div>
    <div className="text-[13px] font-mono text-gray-600 font-medium">{sales} продаж</div>
  </div>
);
