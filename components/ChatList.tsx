import React, { useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { ChatSession, CompanyMember } from '../types';
import { useChatContext } from '../contexts/ChatContext';
import { ConnectorChannelBadge } from './chat/ConnectorChannelBadge';
import { getThreadPreview } from '../utils/chatMessagePreview';
import { isThreadTransportUnavailable } from '../utils/threadTransport';

interface ChatListProps {
  chats: ChatSession[];
  selectedChatId: string;
  onSelectChat: (id: string) => void;
  managers?: CompanyMember[];
  currentUser?: unknown;
  currentCompanyMemberId?: string | null;
  onLoadMoreThreads?: () => void;
  hasMoreThreads?: boolean;
  isThreadsLoadingMore?: boolean;
}

type TabType = 'all' | 'mine' | 'ai' | 'managers';

export const ChatList = React.memo<ChatListProps>(({
  chats,
  selectedChatId,
  onSelectChat,
  currentUser,
  currentCompanyMemberId,
  managers,
  onLoadMoreThreads,
  hasMoreThreads = false,
  isThreadsLoadingMore = false,
}) => {
  const { chatState, setThreadsFilter } = useChatContext();
  const threadsFilter = chatState.threadsFilter as TabType;
  const [showOnlyUnanswered, setShowOnlyUnanswered] = useState(false);
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

  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      if (showOnlyUnanswered && (chat.unreadCount || 0) === 0) return false;

      if (threadsFilter === 'all') return true;
      if (threadsFilter === 'ai') return chat.isAiManaged;
      if (threadsFilter === 'managers') return !chat.isAiManaged;
      if (threadsFilter === 'mine') {
        const myUserId = currentUser?.id;
        const assigneeUserId = chat.assignee?.user_id;

        // Compare based on global user_id if available, otherwise fallback to id
        if (assigneeUserId && myUserId) {
          return String(assigneeUserId) === String(myUserId);
        }

        // Fallback or legacy comparison
        const myLegacyId = currentCompanyMemberId || currentUser?.company_user_id || currentUser?.id;
        return String(chat.assignee?.id) === String(myLegacyId);
      }
      return true;
    });
  }, [chats, threadsFilter, showOnlyUnanswered, currentUser, currentCompanyMemberId]);

  const handleTabChange = useCallback((tab: TabType) => {
    setThreadsFilter(tab);
  }, [setThreadsFilter]);

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
    <div className="flex h-full min-h-0 w-[360px] shrink-0 flex-col border-r border-gray-200 bg-sidebar transition-all duration-300">
      {/* Header - Aligned to h-[64px] with px-8 padding */}
      <div className="h-[64px] px-8 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-gray-900">Входящие</span>
          <span className="text-[11px] font-bold text-gray-500 bg-gray-200/50 px-1.5 py-0.5 rounded">{filteredChats.length}</span>
        </div>
      </div>

      {/* Tabs - Interactive */}
      <div className="px-8 pb-2 flex-shrink-0 border-b border-gray-100/50">
        <div className="flex gap-5">
          <TabButton
            active={threadsFilter === 'all'}
            label="Все"
            onClick={() => handleTabChange('all')}
          />
          <TabButton
            active={threadsFilter === 'mine'}
            label="Мои"
            onClick={() => handleTabChange('mine')}
          />
          <TabButton
            active={threadsFilter === 'ai'}
            label="AI"
            onClick={() => handleTabChange('ai')}
          />
          <TabButton
            active={threadsFilter === 'managers'}
            label="Менеджеры"
            onClick={() => handleTabChange('managers')}
          />
        </div>
      </div>

      {/* Unanswered Toggle */}
      <div className="px-8 py-3 flex items-center gap-2 border-b border-gray-100/50 bg-white/50">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={showOnlyUnanswered}
            onChange={(e) => setShowOnlyUnanswered(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span className="text-[12px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
            Только требующие ответа
          </span>
        </label>
        {showOnlyUnanswered && filteredChats.length > 0 && (
          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full animate-pulse">
            {filteredChats.length}
          </span>
        )}
      </div>

      {/* List - Hidden Scrollbar with px-8 padding for content alignment */}
      <div
        ref={listScrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-1 [&::-webkit-scrollbar]:hidden"
        onScroll={handleListScroll}
      >
        {filteredChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            isSelected={selectedChatId === chat.id}
            onSelect={() => onSelectChat(chat.id)}
            managers={managers}
            currentUser={currentUser}
            currentCompanyMemberId={currentCompanyMemberId}
          />
        ))}
        {filteredChats.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-sm italic">
            Список пуст
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
  );
});

ChatList.displayName = 'ChatList';

const TabButton = React.memo<{ active?: boolean; label: string; onClick: () => void }>(({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`
    text-[13px] font-medium pb-2 transition-all border-b-2
    ${active
        ? 'text-gray-900 border-gray-900'
        : 'text-gray-400 border-transparent hover:text-gray-600'}
  `}>
    {label}
  </button>
));

TabButton.displayName = 'TabButton';

interface ChatListItemProps {
  chat: ChatSession;
  isSelected: boolean;
  onSelect: () => void;
}

const AVATAR_BG: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  shadowing: 'bg-indigo-50 text-indigo-600',
  inactive: 'bg-gray-100 text-gray-400',
};

const SPARKLE_BG: Record<string, string> = {
  active: 'bg-emerald-500',
  shadowing: 'bg-indigo-500',
};

const ChatListItem = React.memo<ChatListItemProps>(({ chat, isSelected, onSelect }) => {
  const stageColor = chat.orderStage?.color;
  const stageName = chat.dealStage;
  const mode = chat.assistantMode;
  const showBotAvatar = mode === 'active' || mode === 'shadowing';
  const preview = getThreadPreview(chat);
  const transportUnavailable = isThreadTransportUnavailable(chat);

  return (
    <div
      onClick={onSelect}
      className={`
        mx-1 p-3 cursor-pointer rounded-xl transition-all duration-200 group relative
        ${isSelected
          ? 'bg-white shadow-md ring-1 ring-gray-100'
          : 'hover:bg-gray-100 text-gray-600'}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${AVATAR_BG[mode]}`}>
              {showBotAvatar ? (
                <div className="relative">
                  <Bot size={20} />
                  <div className={`absolute -top-1 -right-1 ${SPARKLE_BG[mode]} text-white rounded-full p-0.5 border-2 border-white`}>
                    <Sparkles size={8} />
                  </div>
                </div>
              ) : <User size={20} />}
            </div>

            <ConnectorChannelBadge
              connectorTransportType={chat.connector_transport_type}
              channelType={chat.channel_type}
              size="list"
              transportUnavailable={transportUnavailable}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center gap-2">
              <h3 className={`text-[13.5px] font-bold truncate ${isSelected || (chat?.unreadCount || 0) > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                {chat?.customerName || 'Без имени'}
              </h3>
              <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                {chat.lastMessageTime}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              {stageName && stageName !== 'Без стадии' && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: stageColor ? `${stageColor}15` : '#f3f4f6',
                    color: stageColor || '#6b7280',
                  }}
                >
                  {stageName}
                </span>
              )}
              {chat.unreadCount > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className={`text-[12px] leading-[1.4] line-clamp-2 pr-2 ${isSelected ? 'text-gray-600' : 'text-gray-400'}`}>
        {preview || <span className="italic opacity-40">Нет сообщений</span>}
      </p>

      {/* Status Dot */}
      <div className={`absolute top-1/2 -translate-y-1/2 right-3 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm transition-colors ${chat.unreadCount > 0 ? 'bg-red-500' : 'bg-gray-300'
        }`} />
    </div>
  );
});

ChatListItem.displayName = 'ChatListItem';
