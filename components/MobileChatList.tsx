import React, { useMemo, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { Search, Bot, User, ChevronDown, Loader2 } from 'lucide-react';
import { ChatSession, CompanyMember } from '../types';
import { useChatContext } from '../contexts/ChatContext';
import { useUIContext } from '../contexts/UIContext';
import { ConnectorChannelBadge } from './chat/ConnectorChannelBadge';
import { getThreadPreview } from '../utils/chatMessagePreview';
import { isThreadTransportUnavailable } from '../utils/threadTransport';

interface MobileChatListProps {
  chats: ChatSession[];
  selectedChatId: string;
  onSelectChat: (id: string) => void;
  managers?: CompanyMember[];
  currentUser?: unknown;
  currentCompanyMemberId?: string | null;
  companyId?: number;
  onLoadMoreThreads?: () => void;
  hasMoreThreads?: boolean;
  isThreadsLoadingMore?: boolean;
}

type TabType = 'all' | 'mine' | 'ai' | 'managers';

export const MobileChatList = React.memo<MobileChatListProps>(({
  chats,
  selectedChatId,
  onSelectChat,
  currentUser,
  currentCompanyMemberId,
  companyId,
  onLoadMoreThreads,
  hasMoreThreads = false,
  isThreadsLoadingMore = false,
}) => {
  const { chatState, setThreadsFilter } = useChatContext();
  const { toggleUserModal } = useUIContext();
  const threadsFilter = chatState.threadsFilter as TabType;
  const [query, setQuery] = useState('');
  const loadMoreLockRef = useRef(false);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!onLoadMoreThreads || isThreadsLoadingMore) return;
      if (loadMoreLockRef.current) return;
      const el = e.currentTarget;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
      if (!nearBottom) return;
      loadMoreLockRef.current = true;
      onLoadMoreThreads();
      window.setTimeout(() => {
        loadMoreLockRef.current = false;
      }, 400);
    },
    [onLoadMoreThreads, isThreadsLoadingMore],
  );
  const user = (currentUser ?? null) as
    | {
        first_name?: string;
        last_name?: string;
        email?: string;
        companies?: Array<{ company_id: number; company_name: string }>;
      }
    | null;
  const accountLabel = user?.first_name || user?.email || 'Аккаунт';
  const accountInitials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.trim() || 'A';
  const currentCompany = useMemo(() => {
    if (!companyId || !user?.companies?.length) return null;
    return user.companies.find((company) => company.company_id === companyId) ?? null;
  }, [companyId, user?.companies]);

  const filteredChats = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    return chats.filter((chat) => {
      if (threadsFilter === 'ai' && !chat.isAiManaged) return false;
      if (threadsFilter === 'managers' && chat.isAiManaged) return false;
      if (threadsFilter === 'mine') {
        const myUserId = currentUser?.id;
        const assigneeUserId = chat.assignee?.user_id;

        if (assigneeUserId && myUserId) {
          if (String(assigneeUserId) !== String(myUserId)) return false;
        } else {
          const myLegacyId = currentCompanyMemberId || currentUser?.company_user_id || currentUser?.id;
          if (String(chat.assignee?.id) !== String(myLegacyId)) return false;
        }
      }

      if (!normalizedQuery) return true;

      const haystack = [
        chat.customerName,
        chat.lastMessage,
        chat.details.phone,
        chat.details.email,
        chat.dealStage,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [chats, currentCompanyMemberId, currentUser, query, threadsFilter]);

  const loadingMoreRef = useRef(isThreadsLoadingMore);
  loadingMoreRef.current = isThreadsLoadingMore;

  useLayoutEffect(() => {
    const root = listScrollRef.current;
    const target = loadMoreSentinelRef.current;
    if (!root || !target || !onLoadMoreThreads) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMoreRef.current) return;
        onLoadMoreThreads();
      },
      { root, rootMargin: '100px', threshold: 0 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [onLoadMoreThreads, filteredChats.length]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-white">
      <div className="border-b border-gray-100 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[22px] font-semibold tracking-tight text-gray-950">Диалоги</div>
            {currentCompany && (
              <div className="mt-1 text-[11px] font-medium text-gray-400">
                {currentCompany.company_name} • ID {currentCompany.company_id}
              </div>
            )}
            <div className="mt-1 text-[12px] text-gray-500">
              {filteredChats.length} активных чатов
            </div>
          </div>
          <button
            type="button"
            onClick={toggleUserModal}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white pl-1.5 pr-3 text-[12px] font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
            aria-label="Открыть меню аккаунта"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white">
              {accountInitials}
            </span>
            <span className="max-w-[88px] truncate">{accountLabel}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
        </div>

        <div className="relative mt-3">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по чатам"
            className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-[14px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
          />
        </div>

        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
          <MobileFilterChip
            active={threadsFilter === 'all'}
            label="Все"
            onClick={() => setThreadsFilter('all')}
          />
          <MobileFilterChip
            active={threadsFilter === 'mine'}
            label="Мои"
            onClick={() => setThreadsFilter('mine')}
          />
          <MobileFilterChip
            active={threadsFilter === 'ai'}
            label="AI"
            onClick={() => setThreadsFilter('ai')}
          />
          <MobileFilterChip
            active={threadsFilter === 'managers'}
            label="Менеджеры"
            onClick={() => setThreadsFilter('managers')}
          />
        </div>
      </div>

      <div
        ref={listScrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        onScroll={handleListScroll}
      >
        <div className="space-y-2">
          {filteredChats.map((chat) => (
            <MobileChatListItem
              key={chat.id}
              chat={chat}
              isSelected={selectedChatId === chat.id}
              onSelect={() => onSelectChat(chat.id)}
            />
          ))}
          {filteredChats.length === 0 && (
            <div className="rounded-3xl border border-dashed border-gray-200 px-4 py-10 text-center text-[14px] text-gray-400">
              Ничего не найдено
            </div>
          )}
          {filteredChats.length > 0 && (
            <div ref={loadMoreSentinelRef} className="h-px w-full shrink-0" aria-hidden />
          )}
          {isThreadsLoadingMore && (
            <div className="flex justify-center py-3 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" aria-label="Загрузка чатов" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MobileChatList.displayName = 'MobileChatList';

const MobileFilterChip = React.memo<{
  active: boolean;
  label: string;
  onClick: () => void;
}>(({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
      active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
    }`}
  >
    {label}
  </button>
));

MobileFilterChip.displayName = 'MobileFilterChip';

const MobileChatListItem = React.memo<{
  chat: ChatSession;
  isSelected: boolean;
  onSelect: () => void;
}>(({ chat, isSelected, onSelect }) => {
  const showBotAvatar = chat.assistantMode === 'active' || chat.assistantMode === 'shadowing';
  const preview = getThreadPreview(chat);
  const transportUnavailable = isThreadTransportUnavailable(chat);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[24px] border px-3 py-3 text-left transition-colors ${
        isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              showBotAvatar ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {showBotAvatar ? <Bot size={20} /> : <User size={20} />}
          </div>
          <ConnectorChannelBadge
            connectorTransportType={chat.connector_transport_type}
            channelType={chat.channel_type}
            size="mobile"
            transportUnavailable={transportUnavailable}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-[15px] font-semibold text-gray-900">
              {chat.customerName || 'Без имени'}
            </div>
            <div className="shrink-0 text-[11px] font-medium text-gray-400">
              {chat.lastMessageTime}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2">
            {chat.unreadCount > 0 && (
              <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {chat.unreadCount}
              </span>
            )}
            {chat.dealStage && chat.dealStage !== 'Без стадии' && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: chat.orderStage?.color ? `${chat.orderStage.color}15` : '#f3f4f6',
                  color: chat.orderStage?.color || '#6b7280',
                }}
              >
                {chat.dealStage}
              </span>
            )}
          </div>

          <div className="mt-2 line-clamp-2 text-[13px] leading-[1.4] text-gray-500">
            {preview || 'Нет сообщений'}
          </div>
        </div>
      </div>
    </button>
  );
});

MobileChatListItem.displayName = 'MobileChatListItem';
