import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { CreditCard, ArrowLeft, Plus, Loader2, ArrowUpCircle, ArrowDownCircle, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { companiesService } from '../services/companies';
import { usersService } from '../services/users';
import { BalanceResponse, TopUpRequest, User, LedgerEntry, ThreadListItem } from '../types/api';
import { useToast } from '../hooks/useToast';
import { logger } from '../utils/logger';

export const BillingPage: React.FC = () => {
  const { companyId: companyIdParam } = useParams<{ companyId: string }>();
  const companyId = companyIdParam ? parseInt(companyIdParam, 10) : null;
  const navigate = useNavigate();
  const toast = useToast();
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [topUpComment, setTopUpComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [billingHoldThreads, setBillingHoldThreads] = useState<ThreadListItem[]>([]);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [isReactivating, setIsReactivating] = useState(false);

  const fetchBillingHoldThreads = useCallback(async () => {
    if (!companyId) return;
    try {
      const threadsData = await companiesService.getBillingHoldThreads(companyId);
      setBillingHoldThreads(threadsData.items || []);
    } catch (error) {
      logger.error('Failed to fetch billing hold threads', error);
    }
  }, [companyId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setIsLoading(true);
      try {
        const [balanceData, userData, ledgerData] = await Promise.all([
          companiesService.getBalance(companyId),
          usersService.getMe(),
          companiesService.getLedger(companyId),
        ]);
        setBalance(balanceData);
        setUser(userData);
        setLedgerEntries(ledgerData.entries);
        setLedgerTotal(ledgerData.total);
      } catch (error) {
        logger.error('Failed to fetch data', error);
        toast.error('Не удалось загрузить данные');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    fetchBillingHoldThreads();
  }, [companyId, toast, fetchBillingHoldThreads]);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !topUpAmount) return;

    const amount = parseInt(topUpAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    setIsSubmitting(true);
    try {
      const request: TopUpRequest = {
        amount,
        comment: topUpComment || undefined,
      };
      const response = await companiesService.topUp(companyId, request);
      toast.success(`Баланс пополнен на ${response.amount_added} диалогов`);
      setTopUpAmount('');
      setTopUpComment('');
      setIsTopUpOpen(false);

      const [updatedBalance, updatedLedger] = await Promise.all([
        companiesService.getBalance(companyId),
        companiesService.getLedger(companyId),
      ]);
      setBalance(updatedBalance);
      setLedgerEntries(updatedLedger.entries);
      setLedgerTotal(updatedLedger.total);
      await fetchBillingHoldThreads();
    } catch (error) {
      logger.error('Failed to top up balance', error);
      toast.error('Не удалось пополнить баланс');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleThread = (threadId: string) => {
    setSelectedThreadIds(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedThreadIds.size === billingHoldThreads.length) {
      setSelectedThreadIds(new Set());
    } else {
      setSelectedThreadIds(new Set(billingHoldThreads.map(t => t.thread_id)));
    }
  };

  const handleReactivateSelected = async () => {
    if (!companyId || selectedThreadIds.size === 0) return;
    setIsReactivating(true);
    try {
      const threadIds = Array.from(selectedThreadIds);
      const response = await companiesService.reactivateThreads(companyId, threadIds);
      const successCount = Object.values(response.results).filter(r => r.success).length;
      toast.success(`Активировано диалогов: ${successCount} из ${threadIds.length}`);
      setSelectedThreadIds(new Set());
      await Promise.all([
        companiesService.getBalance(companyId).then(setBalance),
        fetchBillingHoldThreads(),
      ]);
    } catch (error) {
      logger.error('Failed to reactivate threads', error);
      toast.error('Не удалось активировать диалоги');
    } finally {
      setIsReactivating(false);
    }
  };

  const handleReactivateAll = async () => {
    if (!companyId || billingHoldThreads.length === 0) return;
    setIsReactivating(true);
    try {
      const threadIds = billingHoldThreads.map(t => t.thread_id);
      const response = await companiesService.reactivateThreads(companyId, threadIds);
      const successCount = Object.values(response.results).filter(r => r.success).length;
      toast.success(`Активировано диалогов: ${successCount} из ${threadIds.length}`);
      setSelectedThreadIds(new Set());
      await Promise.all([
        companiesService.getBalance(companyId).then(setBalance),
        fetchBillingHoldThreads(),
      ]);
    } catch (error) {
      logger.error('Failed to reactivate all threads', error);
      toast.error('Не удалось активировать диалоги');
    } finally {
      setIsReactivating(false);
    }
  };

  if (!companyId) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-8 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Баланс и биллинг</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Загрузка...</div>
          </div>
        ) : balance ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CreditCard size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Текущий баланс</h2>
                </div>
                {user?.is_superuser && (
                  <button
                    onClick={() => setIsTopUpOpen(!isTopUpOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    Пополнить
                  </button>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">{balance.balance}</span>
                <span className="text-sm text-gray-500 uppercase tracking-wider">Диалогов</span>
              </div>
              {balance.balance_warning && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  ⚠️ Баланс низкий. Пополните для продолжения работы.
                </div>
              )}
              {isTopUpOpen && user?.is_superuser && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <form onSubmit={handleTopUp} className="space-y-4">
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                        Сумма пополнения
                      </label>
                      <input
                        id="amount"
                        type="number"
                        min="1"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        placeholder="Введите количество диалогов"
                        className="form-input"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                        Комментарий (необязательно)
                      </label>
                      <input
                        id="comment"
                        type="text"
                        value={topUpComment}
                        onChange={(e) => setTopUpComment(e.target.value)}
                        placeholder="Комментарий к пополнению"
                        className="form-input"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Пополнение...
                          </>
                        ) : (
                          'Пополнить баланс'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsTopUpOpen(false);
                          setTopUpAmount('');
                          setTopUpComment('');
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                </div>
              )}
              <div className="mt-4 text-xs text-gray-400">
                Обновлено: {new Date(balance.updated_at).toLocaleString('ru-RU')}
              </div>
            </div>

            {billingHoldThreads.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">
                    Заблокированные диалоги ({billingHoldThreads.length})
                  </h3>
                  <div className="flex gap-2">
                    {selectedThreadIds.size > 0 && (
                      <button
                        onClick={handleReactivateSelected}
                        disabled={isReactivating}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isReactivating ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Активация...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} />
                            Активировать выбранные ({selectedThreadIds.size})
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={handleReactivateAll}
                      disabled={isReactivating}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isReactivating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Активация...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={16} />
                          Активировать все
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center justify-center w-5 h-5"
                    >
                      {selectedThreadIds.size === billingHoldThreads.length ? (
                        <CheckSquare size={20} className="text-emerald-600" />
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </button>
                    <span className="text-xs font-medium text-gray-500 uppercase">Выбрать все</span>
                  </div>
                  {billingHoldThreads.map((thread) => (
                    <div
                      key={thread.thread_id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <button
                        onClick={() => handleToggleThread(thread.thread_id)}
                        className="flex items-center justify-center w-5 h-5"
                      >
                        {selectedThreadIds.has(thread.thread_id) ? (
                          <CheckSquare size={20} className="text-emerald-600" />
                        ) : (
                          <Square size={20} className="text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {thread.customer_name || 'Без имени'}
                        </div>
                        {thread.last_message_preview && (
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {thread.last_message_preview}
                          </div>
                        )}
                      </div>
                      {thread.last_message_at && (
                        <div className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(thread.last_message_at).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">
                История операций {ledgerTotal > 0 && <span className="text-gray-400 font-normal">({ledgerTotal})</span>}
              </h3>
              {ledgerEntries.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                  Нет операций
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {ledgerEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        {entry.operation_type === 'top_up' ? (
                          <ArrowUpCircle size={18} className="text-emerald-500" />
                        ) : (
                          <ArrowDownCircle size={18} className="text-red-400" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {entry.operation_type === 'top_up' ? 'Пополнение' : 'Списание'}
                          </div>
                          {entry.comment && (
                            <div className="text-xs text-gray-400">{entry.comment}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${entry.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {entry.amount > 0 ? '+' : ''}{entry.amount}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(entry.timestamp).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            Не удалось загрузить данные баланса
          </div>
        )}
      </div>
    </div>
  );
};
