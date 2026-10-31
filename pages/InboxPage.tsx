import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { InboxView } from '../components/workspace/InboxView';
import { useChatContext } from '../contexts/ChatContext';
import { useIdentityContext } from '../contexts/IdentityContext';
import { useUIContext } from '../contexts/UIContext';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useThreadsRuntime } from '../contexts/ThreadsRuntimeContext';
import { useMessages } from '../hooks/useMessages';
import { useStages } from '../hooks/useStages';
import { useToast } from '../hooks/useToast';
import { logger } from '../utils/logger';
import { customersService, threadsService, companiesService, ordersService } from '../services';
import { Message, MessageType, CompanyMember } from '../types';
import { getMessagePreview } from '../utils/chatMessagePreview';
import { formatMessageClock } from '../utils/chatDate';
import { isThreadTransportUnavailable } from '../utils/threadTransport';

export const InboxPage: React.FC = () => {
    const { companyId: companyIdParam } = useParams<{ companyId: string }>();
    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : null;

    const { chatState, chatDispatch, setSelectedChatId, updateThread, addMessage, updateMessage } =
        useChatContext();
    const { identityState } = useIdentityContext();
    const { uiState, uiDispatch, toggleProfile } = useUIContext();

    const { fetchThreads, loadMoreThreads, hasMoreThreads } = useThreadsRuntime();
    const { fetchMessages, loadOlderMessages, hasMoreOlderMessages } = useMessages(companyId);
    const { subscribeThread, unsubscribeThread } = useWebSocketContext();
    const { stages } = useStages(companyId);
    const toast = useToast();
    const [managers, setManagers] = React.useState<CompanyMember[]>([]);
    const [isIntercepting, setIsIntercepting] = useState(false);
    const [isReturningToAgent, setIsReturningToAgent] = useState(false);
    const fetchedCustomerIds = React.useRef<Set<string>>(new Set());

    const saveContextRef = useRef({ companyId, selectedChatId: '', thread: null as { customerId?: string; details?: { customer_fields?: Record<string, unknown> } } | null });
    useEffect(() => {
        const thread = chatState.threads.find(t => t.id === chatState.selectedChatId) ?? null;
        saveContextRef.current = {
            companyId: companyId ?? undefined,
            selectedChatId: chatState.selectedChatId,
            thread,
        };
    }, [companyId, chatState.selectedChatId, chatState.threads]);

    useEffect(() => {
        if (!companyId) return;
        const fetchManagers = async () => {
            try {
                const response = await companiesService.listMembers(companyId);
                const items = Array.isArray(response) ? response : (response.items || []);
                setManagers(items);
            } catch (error) {
                logger.error('Failed to fetch managers', error);
            }
        };
        fetchManagers();
    }, [companyId]);

    useEffect(() => {
        if (!companyId || !chatState.selectedChatId) return;

        const threadId = chatState.selectedChatId;
        const thread = chatState.threads.find(t => t.id === threadId);
        const cachedMessages = thread?.messages ?? [];

        // Cache-then-network avoids white flashes when reopening a visited thread.
        if (cachedMessages.length > 0) {
            chatDispatch({ type: 'SET_ACTIVE_MESSAGES', payload: cachedMessages });
            fetchMessages(threadId, true);
        } else {
            fetchMessages(threadId, false);
        }

        if (thread?.customerId && !fetchedCustomerIds.current.has(`${threadId}-${thread.customerId}`)) {
            const fetchDetails = async () => {
                try {
                    const customer = await customersService.getCustomer(companyId, thread.customerId!);
                    fetchedCustomerIds.current.add(`${threadId}-${thread.customerId}`);
                    updateThread(threadId, {
                        customerName: customer.name || thread.customerName,
                        details: {
                            ...thread.details,
                            email: customer.email || '-',
                            phone: customer.phone || '-',
                            location: customer.location || '-',
                            username: customer.username || '',
                            customer_fields: customer.customer_fields || {},
                        },
                    });
                } catch (error) {
                    logger.error('Failed to fetch customer details', error);
                }
            };
            fetchDetails();
        }

        // Subscribe to real-time updates for this thread
        subscribeThread(threadId);

        return () => {
            unsubscribeThread(threadId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, chatDispatch, chatState.selectedChatId]);

    const handleSendMessage = async (content: string, isNote: boolean, attachments?: import('../types/api').AttachmentDescriptor[]) => {
        if (!chatState.selectedChatId || !companyId) return;
        const threadForSend = chatState.threads.find((t) => t.id === chatState.selectedChatId);
        if (!isNote && threadForSend && isThreadTransportUnavailable(threadForSend)) {
            toast.error(
                'Канал с мессенджером недоступен. Подключите коннектор или отправьте внутреннюю заметку.',
            );
            return;
        }
        const tempId = `temp-${chatState.selectedChatId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const createdAt = new Date().toISOString();
        const timestamp = formatMessageClock(createdAt);

        const optimisticMsg: Message = {
            id: tempId,
            clientId: tempId,
            type: isNote ? MessageType.NOTE : MessageType.MANAGER,
            content: content,
            createdAt,
            timestamp: timestamp,
            read: true,
            senderName: 'Вы',
            status: 'sent',
            ...(attachments && attachments.length > 0 ? { artifact_ids: attachments.map((a) => a.artifact_id) } : {}),
        };

        addMessage(optimisticMsg);

        const thread = chatState.threads.find(t => t.id === chatState.selectedChatId);
        if (thread) {
            const preview = getMessagePreview(optimisticMsg);
            updateThread(chatState.selectedChatId, {
                lastMessage: preview,
                lastMessageTime: timestamp,
                isAiManaged: isNote ? thread.isAiManaged : false
            });
        }

        try {
            const sent = await threadsService.sendMessage(companyId, chatState.selectedChatId, {
                role: "manager",
                content: content,
                is_note: isNote,
                pause_assistant: true,
                ...(attachments && attachments.length > 0 ? { attachments } : {}),
            });
            // Replace the temp message with the real one so WS deduplication works by ID
            chatDispatch({
                type: 'REPLACE_OPTIMISTIC_MESSAGE',
                payload: {
                    tempId,
                    message: { ...optimisticMsg, id: sent.message_id, clientId: tempId, status: 'sent' },
                },
            });
            fetchThreads(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger.error("Failed to send message", error);
            updateMessage(tempId, {
                status: 'failed',
                metadata: { error: errorMessage },
            });
            toast.error(`Не удалось отправить сообщение: ${errorMessage}`);
        }
    };

    const handleStopAssistant = async () => {
        if (!chatState.selectedChatId || !companyId || isIntercepting) return;
        setIsIntercepting(true);
        try {
            await threadsService.stopAssistant(companyId, chatState.selectedChatId);
            updateThread(chatState.selectedChatId, { isAiManaged: false });
            fetchThreads(true);
            toast.success('Управление перехвачено');
        } catch (error) {
            logger.error('Failed to stop assistant', error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            toast.error(`Ошибка при перехвате управления: ${errorMessage}`);
        } finally {
            setIsIntercepting(false);
        }
    };

    const handleUpdateCustomerBasicInfo = async (name: string, phone: string) => {
        if (!chatState.selectedChatId || !companyId) return;
        const thread = chatState.threads.find(t => t.id === chatState.selectedChatId);
        if (!thread?.customerId) return;
        try {
            updateThread(chatState.selectedChatId, {
                customerName: name,
                details: { ...thread.details, phone: phone }
            });
            await customersService.updateCustomer(companyId, thread.customerId, { name, phone });
        } catch (error) {
            logger.error('Failed to update customer info', error);
        }
    };

    const handleUpdateFields = useCallback(async (fieldKey: string, newValue: string | number | boolean | null) => {
        const { companyId: ctxCompanyId, selectedChatId, thread } = saveContextRef.current;
        if (!selectedChatId || !ctxCompanyId) {
            logger.warn('Fields save skipped: no company or chat selected');
            toast.warning('Не удалось сохранить: выберите чат');
            return;
        }
        if (!thread?.customerId) {
            logger.warn('Fields save skipped: no customerId for thread', { selectedChatId });
            toast.warning('Не удалось сохранить: нет данных клиента');
            return;
        }
        try {
            const updatedFields = { ...(thread.details?.customer_fields || {}), [fieldKey]: newValue };
            updateThread(selectedChatId, {
                details: { ...thread.details, customer_fields: updatedFields }
            });
            logger.debug('Saving customer fields', { companyId: ctxCompanyId, customerId: thread.customerId, fieldKey });
            await customersService.updateFields(ctxCompanyId, thread.customerId, { [fieldKey]: newValue });
            toast.success('Данные сохранены');
        } catch (error) {
            logger.error('Failed to update fields', error as Error);
            toast.error('Ошибка при сохранении данных');
        }
    }, [updateThread, toast]);

    const handleUpdateStage = async (newStageId: string) => {
        if (!chatState.selectedChatId || !companyId) return;

        const thread = chatState.threads.find(t => t.id === chatState.selectedChatId);
        if (!thread?.orderId) {
            toast.error('Нет активного заказа для изменения стадии');
            return;
        }

        const newStage = stages.find(s => String(s.id) === newStageId);
        const oldStageName = thread.orderStage?.name || 'Без стадии';
        const newStageName = newStage?.name || newStageId;

        updateThread(chatState.selectedChatId, {
            dealStage: newStageName,
            orderStage: newStage ? { id: newStage.id, name: newStage.name, color: newStage.color, position: newStage.position } : null,
        });

        try {
            await ordersService.update(companyId, thread.orderId, { stage_id: parseInt(newStageId, 10) });
            fetchThreads(true);
        } catch (error) {
            logger.error('Failed to update stage', error);
            updateThread(chatState.selectedChatId, {
                dealStage: oldStageName,
                orderStage: thread.orderStage,
            });
            toast.error('Не удалось обновить стадию');
        }
    };

    const handleOpenOrder = (orderId: number) => {
        // Order panel is handled in InboxView
    };

    const handleUpdateAssignee = async (managerId: string) => {
        if (!chatState.selectedChatId || !companyId) return;

        const currentThread = chatState.threads.find(t => t.id === chatState.selectedChatId);
        if (!currentThread?.orderId) {
            toast.error('Нет активного заказа для назначения');
            return;
        }
        const wasAiManaged = currentThread?.isAiManaged;

        let managerName = 'AI Agent';
        if (managerId !== 'ai-agent') {
            const manager = managers.find(m => String(m.id) === managerId);
            if (manager) {
                managerName = `${manager.first_name} ${manager.last_name}`.trim() || manager.email;
            }
        }

        const isReturnToAgent = managerId === 'ai-agent';
        if (isReturnToAgent) {
            setIsReturningToAgent(true);
        } else {
            updateThread(chatState.selectedChatId, {
                assistantMode: 'inactive',
                isAiManaged: false,
                assignee: { id: managerId, name: managerName }
            });
        }

        try {
            const assigneeId = managerId === 'ai-agent' ? null : parseInt(managerId, 10);
            await ordersService.updateAssignee(companyId, currentThread.orderId, assigneeId);
            if (wasAiManaged && managerId !== 'ai-agent') {
                await threadsService.stopAssistant(companyId, chatState.selectedChatId);
            }
            if (isReturnToAgent) {
                await threadsService.resumeAssistant(companyId, chatState.selectedChatId);
            }
            fetchThreads(true);
            toast.success(`Ответственный изменен: ${managerName}`);
            if (isReturnToAgent) {
                updateThread(chatState.selectedChatId, {
                    assistantMode: 'active',
                    isAiManaged: true,
                    assignee: undefined,
                });
            }
        } catch (error) {
            logger.error('Failed to update assignee', error);
            toast.error('Не удалось изменить ответственного');
            if (!isReturnToAgent) {
                updateThread(chatState.selectedChatId, {
                    assistantMode: currentThread.assistantMode,
                    isAiManaged: wasAiManaged,
                    assignee: currentThread.assignee,
                });
            }
        } finally {
            if (isReturnToAgent) setIsReturningToAgent(false);
        }
    };

    const selectedChat = useMemo(() => {
        const selectedThreadSummary = chatState.threads.find(t => t.id === chatState.selectedChatId);
        return selectedThreadSummary
            ? { ...selectedThreadSummary, messages: chatState.activeMessages }
            : undefined;
    }, [chatState.threads, chatState.selectedChatId, chatState.activeMessages]);

    return (
        <InboxView
            threads={chatState.threads}
            selectedChat={selectedChat}
            isThreadsLoading={chatState.isThreadsLoading}
            isThreadsLoadingMore={chatState.isThreadsLoadingMore}
            hasMoreThreads={hasMoreThreads}
            onLoadMoreThreads={() => void loadMoreThreads()}
            isMessagesLoading={chatState.isMessagesLoading}
            isLoadingOlderMessages={chatState.isLoadingOlderMessages}
            hasMoreOlderMessages={hasMoreOlderMessages}
            onLoadOlderMessages={() => void loadOlderMessages()}
            isProfileOpen={uiState.isProfileOpen}
            stagesConfig={stages}
            companyFields={identityState.companyFields}
            onSelectChat={setSelectedChatId}
            onToggleSidebar={toggleProfile}
            onSendMessage={handleSendMessage}
            onStopAssistant={handleStopAssistant}
            isIntercepting={isIntercepting}
            onReturnToAgent={
              selectedChat?.orderId
                ? () => handleUpdateAssignee('ai-agent')
                : undefined
            }
            isReturningToAgent={isReturningToAgent}
            onUpdateCustomer={handleUpdateCustomerBasicInfo}
            onUpdateQuiz={handleUpdateFields}
            onUpdateStage={handleUpdateStage}
            onUpdateAssignee={handleUpdateAssignee}
            onCloseProfile={() => uiDispatch({ type: 'SET_PROFILE_OPEN', payload: false })}
            onOpenOrder={handleOpenOrder}
            managers={managers}
            currentUser={identityState.currentUser}
            currentCompanyMemberId={identityState.currentCompanyMemberId}
            viewerUserId={identityState.currentUser?.id ?? null}
            companyId={companyId ?? undefined}
        />
    );
};
