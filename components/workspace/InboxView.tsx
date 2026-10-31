import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ChatList } from '../ChatList';
import { ChatWindow } from '../ChatWindow';
import { CustomerProfile } from '../CustomerProfile';
import { MobileChatList } from '../MobileChatList';
import { threadQualificationAssigneeId } from '../../utils/orderAssigneeUi';
import { OrderDetailPanel } from '../OrderDetailPanel';
import { ChatSession, CompanyField, CompanyMember } from '../../types';
import type { StageTemplate, Customer } from '../../types/api';
import { useIsMobile } from '../../hooks/useIsMobile';

interface InboxViewProps {
  threads: ChatSession[];
  selectedChat: ChatSession | undefined;
  isThreadsLoading: boolean;
  isThreadsLoadingMore?: boolean;
  hasMoreThreads?: boolean;
  onLoadMoreThreads?: () => void;
  isMessagesLoading: boolean;
  isLoadingOlderMessages?: boolean;
  hasMoreOlderMessages?: boolean;
  onLoadOlderMessages?: () => void;
  isProfileOpen: boolean;
  stagesConfig: StageTemplate[];
  companyFields: CompanyField[];
  onSelectChat: (id: string) => void;
  onToggleSidebar: () => void;
  onSendMessage: (content: string, isNote: boolean, attachments?: import('../../types/api').AttachmentDescriptor[]) => void;
  onStopAssistant: () => void;
  isIntercepting?: boolean;
  isReturningToAgent?: boolean;
  onReturnToAgent?: () => void;
  onUpdateCustomer: (name: string, phone: string) => void;
  onUpdateQuiz: (key: string, value: string | number | boolean | null) => void;
  onUpdateStage: (stageId: string) => void;
  onUpdateAssignee: (managerId: string) => void;
  onCloseProfile: () => void;
  managers?: CompanyMember[];
  currentUser?: unknown;
  currentCompanyMemberId?: string | null;
  viewerUserId?: number | null;
  companyId?: number;
  onOpenOrder?: (orderId: number) => void;
}

export const InboxView = React.memo<InboxViewProps>(({
  threads,
  selectedChat,
  isThreadsLoading,
  isThreadsLoadingMore = false,
  hasMoreThreads = false,
  onLoadMoreThreads,
  isMessagesLoading,
  isLoadingOlderMessages = false,
  hasMoreOlderMessages = false,
  onLoadOlderMessages,
  isProfileOpen,
  stagesConfig,
  companyFields,
  onSelectChat,
  onToggleSidebar,
  onSendMessage,
  onStopAssistant,
  isIntercepting = false,
  isReturningToAgent = false,
  onReturnToAgent,
  onUpdateCustomer,
  onUpdateQuiz,
  onUpdateStage,
  onUpdateAssignee,
  onCloseProfile,
  managers = [],
  currentUser,
  currentCompanyMemberId,
  viewerUserId = null,
  companyId,
  onOpenOrder,
}) => {
  const selectedChatId = useMemo(() => selectedChat?.id || '', [selectedChat?.id]);
  const [searchParams, setSearchParams] = useSearchParams();
  const threadParam = searchParams.get('thread');
  const orderParam = searchParams.get('order');
  const isMobile = useIsMobile();
  const selectedOrderId = useMemo(() => {
    if (!orderParam) return null;
    const id = parseInt(orderParam, 10);
    return Number.isNaN(id) ? null : id;
  }, [orderParam]);
  const isOrderPanelOpen = selectedOrderId != null;
  const mobilePane: 'list' | 'chat' | 'details' = !threadParam
    ? 'list'
    : isProfileOpen
      ? 'details'
      : 'chat';

  useEffect(() => {
    const nextThreadId = threadParam ?? '';
    if (nextThreadId !== selectedChatId) {
      onSelectChat(nextThreadId);
    }
  }, [threadParam, selectedChatId, onSelectChat]);

  useEffect(() => {
    if (selectedOrderId != null) {
      onOpenOrder?.(selectedOrderId);
    }
  }, [selectedOrderId, onOpenOrder]);

  const updateInboxSearchParams = (
    updater: (prev: URLSearchParams) => URLSearchParams,
    replace = true,
  ) => {
    setSearchParams(
      (prev) => updater(new URLSearchParams(prev)),
      { replace, preventScrollReset: true }
    );
  };

  const handleSelectChat = (id: string) => {
    if (threadParam === id && !orderParam) return;
    if (isProfileOpen) {
      onCloseProfile();
    }
    updateInboxSearchParams((next) => {
      next.set('thread', id);
      next.delete('order');
      return next;
    });
  };

  const handleOpenProfile = () => {
    if (!isProfileOpen) {
      onToggleSidebar();
    }
  };

  const handleCloseProfile = () => {
    onCloseProfile();
  };

  const handleBackToList = () => {
    if (isProfileOpen) onCloseProfile();
    updateInboxSearchParams((next) => {
      next.delete('thread');
      next.delete('order');
      return next;
    });
  };

  const handleOpenOrder = (orderId: number) => {
    onOpenOrder?.(orderId);
    updateInboxSearchParams((next) => {
      const activeThreadId = selectedChatId || next.get('thread');
      if (activeThreadId) {
        next.set('thread', activeThreadId);
      }
      next.set('order', String(orderId));
      return next;
    });
  };

  const handleCloseOrder = () => {
    updateInboxSearchParams((next) => {
      next.delete('order');
      return next;
    });
  };

  const profileCustomer: Customer | null = selectedChat ? {
    id: selectedChat.customerId ?? '',
    name: selectedChat.customerName,
    phone: selectedChat.details.phone,
    email: selectedChat.details.email,
    location: selectedChat.details.location,
    username: selectedChat.details.username,
    customer_fields: selectedChat.details.customer_fields ?? {},
  } : null;

  const profileAssigneeId = selectedChat ? threadQualificationAssigneeId({
    assignee: selectedChat.assignee,
    isAiManaged: selectedChat.isAiManaged,
  }) : '';
  const profileStageId = selectedChat?.orderStage?.id ? String(selectedChat.orderStage.id) : '';

  if (isMobile) {
    return (
      <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-white">
        {mobilePane === 'list' && (
          <>
            {isThreadsLoading && threads.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="animate-spin text-gray-400" />
              </div>
            ) : (
              <MobileChatList
                chats={threads}
                selectedChatId={selectedChatId}
                onSelectChat={handleSelectChat}
                currentUser={currentUser}
                currentCompanyMemberId={currentCompanyMemberId}
                companyId={companyId}
                managers={managers}
                onLoadMoreThreads={onLoadMoreThreads}
                hasMoreThreads={hasMoreThreads}
                isThreadsLoadingMore={isThreadsLoadingMore}
              />
            )}
          </>
        )}

        {mobilePane !== 'list' && (
          <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-white">
            {isMessagesLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                <Loader2 className="animate-spin text-indigo-500" />
              </div>
            )}
            {selectedChat ? (
              <ChatWindow
                chat={selectedChat}
                companyId={companyId}
                viewerCompanyMemberId={currentCompanyMemberId}
                viewerUserId={viewerUserId}
                toggleSidebar={handleOpenProfile}
                isSidebarOpen={isProfileOpen}
                onSendMessage={onSendMessage}
                onStopAssistant={onStopAssistant}
                isIntercepting={isIntercepting}
                isReturningToAgent={isReturningToAgent}
                onReturnToAgent={onReturnToAgent}
                onOpenOrder={companyId ? handleOpenOrder : undefined}
                variant="mobile"
                onBack={handleBackToList}
                onRequestLoadOlderMessages={onLoadOlderMessages}
                isLoadingOlderMessages={isLoadingOlderMessages}
                hasMoreOlderMessages={hasMoreOlderMessages}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center bg-white">
                <Loader2 className="animate-spin text-gray-400" />
              </div>
            )}
          </div>
        )}

        {isProfileOpen && selectedChat && profileCustomer && mobilePane === 'details' && (
          <div className="animate-mobile-drawer-in absolute inset-0 z-20 bg-white">
            <CustomerProfile
              key={`${selectedChat.id}-mobile`}
              variant="mobile"
              customer={profileCustomer}
              stages={stagesConfig}
              companyId={companyId}
              companyFields={companyFields}
              managers={managers}
              transportMeta={{
                whatsapp: selectedChat.metadata?.phone_number ? String(selectedChat.metadata.phone_number) : undefined,
                telegramId: selectedChat.metadata?.telegram_id ? String(selectedChat.metadata.telegram_id) : undefined,
                telegramUsername: selectedChat.metadata?.username ? String(selectedChat.metadata.username) : undefined,
              }}
              currentStageId={profileStageId}
              currentAssigneeId={profileAssigneeId}
              currentOrderId={selectedChat.orderId}
              customerId={selectedChat.customerId ? parseInt(selectedChat.customerId, 10) : undefined}
              onClose={handleCloseProfile}
              onSaveContact={onUpdateCustomer}
              onFieldChange={onUpdateQuiz}
              onUpdateStage={onUpdateStage}
              onUpdateAssignee={onUpdateAssignee}
              onOpenOrder={companyId ? handleOpenOrder : undefined}
              chatDebugInfo={{
                id: selectedChat.id,
                channelType: selectedChat.channel_type,
                orderId: selectedChat.orderId,
                username: selectedChat.metadata?.username ? String(selectedChat.metadata.username) : undefined,
                phone: selectedChat.metadata?.phone_number ? String(selectedChat.metadata.phone_number) : undefined,
              }}
            />
          </div>
        )}

        {isOrderPanelOpen && selectedOrderId && companyId && (
          <div className="absolute inset-0 z-30 bg-white">
            <OrderDetailPanel
              companyId={companyId}
              orderId={selectedOrderId}
              companyFields={companyFields}
              onClose={handleCloseOrder}
              onOrderUpdated={() => {
                if (onSelectChat) {
                  onSelectChat(selectedChatId);
                }
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {isThreadsLoading && threads.length === 0 ? (
        <div className="w-[360px] flex items-center justify-center border-r border-gray-200">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      ) : (
        <ChatList
          chats={threads}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          currentUser={currentUser}
          currentCompanyMemberId={currentCompanyMemberId}
          managers={managers}
          onLoadMoreThreads={onLoadMoreThreads}
          hasMoreThreads={hasMoreThreads}
          isThreadsLoadingMore={isThreadsLoadingMore}
        />
      )}
      {selectedChat ? (
        <div className="relative flex h-full min-h-0 flex-1 flex-col">
          {isMessagesLoading && (
            <div className="absolute top-16 left-0 right-0 bottom-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <Loader2 className="animate-spin text-indigo-500" />
            </div>
          )}
          <ChatWindow
            chat={selectedChat}
            companyId={companyId}
            viewerCompanyMemberId={currentCompanyMemberId}
            viewerUserId={viewerUserId}
            toggleSidebar={handleOpenProfile}
            isSidebarOpen={isProfileOpen}
            onSendMessage={onSendMessage}
            onStopAssistant={onStopAssistant}
            isIntercepting={isIntercepting}
            isReturningToAgent={isReturningToAgent}
            onReturnToAgent={onReturnToAgent}
            onOpenOrder={companyId ? handleOpenOrder : undefined}
            onRequestLoadOlderMessages={onLoadOlderMessages}
            isLoadingOlderMessages={isLoadingOlderMessages}
            hasMoreOlderMessages={hasMoreOlderMessages}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-50 text-sm text-gray-400">
          Выберите чат
        </div>
      )}
      {isProfileOpen && selectedChat && profileCustomer && (
        <CustomerProfile
          key={selectedChat.id}
          customer={profileCustomer}
          stages={stagesConfig}
          companyId={companyId}
          companyFields={companyFields}
          managers={managers}
          transportMeta={{
            whatsapp: selectedChat.metadata?.phone_number ? String(selectedChat.metadata.phone_number) : undefined,
            telegramId: selectedChat.metadata?.telegram_id ? String(selectedChat.metadata.telegram_id) : undefined,
            telegramUsername: selectedChat.metadata?.username ? String(selectedChat.metadata.username) : undefined,
          }}
          currentStageId={profileStageId}
          currentAssigneeId={profileAssigneeId}
          currentOrderId={selectedChat.orderId}
          customerId={selectedChat.customerId ? parseInt(selectedChat.customerId, 10) : undefined}
          onClose={handleCloseProfile}
          onSaveContact={onUpdateCustomer}
          onFieldChange={onUpdateQuiz}
          onUpdateStage={onUpdateStage}
          onUpdateAssignee={onUpdateAssignee}
          onOpenOrder={companyId ? handleOpenOrder : undefined}
          chatDebugInfo={{
            id: selectedChat.id,
            channelType: selectedChat.channel_type,
            orderId: selectedChat.orderId,
            username: selectedChat.metadata?.username ? String(selectedChat.metadata.username) : undefined,
            phone: selectedChat.metadata?.phone_number ? String(selectedChat.metadata.phone_number) : undefined,
          }}
        />
      )}
      {isOrderPanelOpen && selectedOrderId && companyId && (
        <OrderDetailPanel
          companyId={companyId}
          orderId={selectedOrderId}
          companyFields={companyFields}
          onClose={handleCloseOrder}
          onOrderUpdated={() => {
            if (onSelectChat) {
              onSelectChat(selectedChatId);
            }
          }}
        />
      )}
    </div>
  );
});

InboxView.displayName = 'InboxView';
