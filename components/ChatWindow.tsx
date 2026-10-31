import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChatSession, Message } from '../types';
import type { AttachmentDescriptor } from '../types/api';
import { ChatHeader } from './chat/ChatHeader';
import { ChatTranscript } from './chat/ChatTranscript';
import { ChatComposer } from './chat/ChatComposer';
import { useChatNewMessageIds } from '../hooks/useChatNewMessageIds';
import { useChatInputAreaHeight } from '../hooks/useChatInputAreaHeight';
import { useChatRubberOverscroll } from '../hooks/useChatRubberOverscroll';
import { useScrollToBottomOnLastMessage } from '../hooks/useScrollToBottomOnLastMessage';
import { usePendingAttachmentUploads } from '../hooks/usePendingAttachmentUploads';
import { useChatVoiceCapture } from '../hooks/useChatVoiceCapture';
import { useChatContext } from '../contexts/ChatContext';
import { EmojiClickData } from 'emoji-picker-react';
import { MobileChatComposer } from './chat/MobileChatComposer';
import { TransportUnavailableBanner } from './chat/TransportUnavailableBanner';
import { isThreadTransportUnavailable } from '../utils/threadTransport';

const ASSISTANT_TYPING_FALLBACK_CLEAR_MS = 45000;

const EMPTY_CHAT_MESSAGES: Message[] = [];

interface ChatWindowProps {
  chat: ChatSession;
  companyId?: number;
  viewerCompanyMemberId?: string | null;
  viewerUserId?: number | null;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  onSendMessage: (text: string, isNote: boolean, attachments?: AttachmentDescriptor[]) => void;
  onStopAssistant?: () => void;
  onReturnToAgent?: () => void;
  isIntercepting?: boolean;
  isReturningToAgent?: boolean;
  onOpenOrder?: (orderId: number) => void;
  variant?: 'desktop' | 'mobile';
  onBack?: () => void;
  onRequestLoadOlderMessages?: () => void;
  isLoadingOlderMessages?: boolean;
  hasMoreOlderMessages?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  companyId,
  viewerCompanyMemberId = null,
  viewerUserId = null,
  toggleSidebar,
  isSidebarOpen,
  onSendMessage,
  onStopAssistant,
  onReturnToAgent,
  isIntercepting = false,
  isReturningToAgent = false,
  onOpenOrder,
  variant = 'desktop',
  onBack,
  onRequestLoadOlderMessages,
  isLoadingOlderMessages = false,
  hasMoreOlderMessages = false,
}) => {
  const { chatState, chatDispatch } = useChatContext();
  const showAssistantTyping = !!chatState.assistantTypingByThreadId[chat.id];

  useEffect(() => {
    if (!showAssistantTyping) return;
    const t = window.setTimeout(() => {
      chatDispatch({ type: 'SET_ASSISTANT_TYPING', payload: { threadId: chat.id, active: false } });
    }, ASSISTANT_TYPING_FALLBACK_CLEAR_MS);
    return () => window.clearTimeout(t);
  }, [showAssistantTyping, chat.id, chatDispatch]);

  const chatMessages = chat.messages ?? EMPTY_CHAT_MESSAGES;
  const [inputValue, setInputValue] = useState('');
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const { pendingAttachments, setPendingAttachments, handleFileChange } = usePendingAttachmentUploads({
    companyId,
    resetKey: chat.id,
    setIsUploading,
  });

  const {
    voiceState,
    voicePreviewUrl,
    recordingBarRef,
    elapsed,
    isVoiceActive,
    finishRecording,
    confirmSendVoice,
    discardVoice,
    cancelRecording,
    toggleVoiceRecording,
  } = useChatVoiceCapture({
    resetKey: chat.id,
    companyId,
    noteMode: isNoteMode,
    isUploading,
    setIsUploading,
    onSendMessage,
  });

  const hasContent = inputValue.trim() !== '' || pendingAttachments.length > 0;
  const showMicButton = !hasContent && !isNoteMode && !isUploading && !isVoiceActive;

  const newMessageIds = useChatNewMessageIds(chat.id, chatMessages);
  const inputAreaHeight = useChatInputAreaHeight(inputAreaRef);
  const { rubberOffset, rubberSnapping } = useChatRubberOverscroll(scrollContainerRef);

  const lastMessageKey = useMemo(() => {
    const last = chatMessages.at(-1);
    return last ? last.clientId ?? last.id : undefined;
  }, [chatMessages]);
  useScrollToBottomOnLastMessage(messagesEndRef, lastMessageKey);

  useEffect(() => {
    setIsNoteMode(false);
    setShowEmojiPicker(false);
  }, [chat.id]);

  const transportUnavailable = isThreadTransportUnavailable(chat);
  useEffect(() => {
    if (transportUnavailable) {
      setIsNoteMode(true);
    }
  }, [transportUnavailable, chat.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleIntercept = useCallback(() => {
    onStopAssistant?.();
  }, [onStopAssistant]);

  const handleSend = useCallback(() => {
    if (transportUnavailable && !isNoteMode) return;
    if (!inputValue.trim() && pendingAttachments.length === 0) return;
    const attachments = pendingAttachments.map((p) => p.descriptor);
    onSendMessage(inputValue, isNoteMode, attachments.length > 0 ? attachments : undefined);
    setInputValue('');
    setPendingAttachments((prev) => {
      prev.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      return [];
    });
  }, [inputValue, isNoteMode, onSendMessage, pendingAttachments, setPendingAttachments, transportUnavailable]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSend();
      }
    },
    [handleSend],
  );

  const onEmojiClick = useCallback((emojiData: EmojiClickData) => {
    setInputValue((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  }, []);

  return (
    <div
      className={`relative z-0 flex h-full min-h-0 flex-1 overflow-hidden bg-white ${
        variant === 'desktop' ? 'border-r border-gray-200 flex-col' : 'grid grid-rows-[auto_minmax(0,1fr)_auto]'
      }`}
    >
      <ChatHeader
        chat={chat}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        onOpenOrder={onOpenOrder}
        variant={variant}
        onBack={onBack}
      />

      <ChatTranscript
        isAiManaged={chat.isAiManaged}
        chatMessages={chatMessages}
        companyId={companyId}
        newMessageIds={newMessageIds}
        scrollContainerRef={scrollContainerRef}
        messagesEndRef={messagesEndRef}
        inputAreaHeight={variant === 'mobile' ? 0 : inputAreaHeight}
        rubberOffset={rubberOffset}
        rubberSnapping={rubberSnapping}
        showAssistantTyping={showAssistantTyping}
        variant={variant}
        onRequestLoadOlder={onRequestLoadOlderMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        hasMoreOlderMessages={hasMoreOlderMessages}
      />

      {variant === 'mobile' ? (
        <>
          {transportUnavailable && <TransportUnavailableBanner variant="mobile" />}
          <MobileChatComposer
            inputAreaRef={inputAreaRef}
            chat={chat}
            companyId={companyId}
            inputValue={inputValue}
            setInputValue={setInputValue}
            isNoteMode={isNoteMode}
            setIsNoteMode={setIsNoteMode}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            emojiPickerRef={emojiPickerRef}
            pendingAttachments={pendingAttachments}
            setPendingAttachments={setPendingAttachments}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            viewerCompanyMemberId={viewerCompanyMemberId}
            viewerUserId={viewerUserId}
            isIntercepting={isIntercepting}
            isReturningToAgent={isReturningToAgent}
            onReturnToAgent={onReturnToAgent}
            handleIntercept={handleIntercept}
            handleSend={handleSend}
            handleKeyDown={handleKeyDown}
            onEmojiClick={onEmojiClick}
            handleFileChange={handleFileChange}
            voiceState={voiceState}
            isVoiceActive={isVoiceActive}
            showMicButton={showMicButton}
            voicePreviewUrl={voicePreviewUrl}
            recordingBarRef={recordingBarRef}
            elapsed={elapsed}
            confirmSendVoice={confirmSendVoice}
            discardVoice={discardVoice}
            cancelRecording={cancelRecording}
            finishRecording={finishRecording}
            onToggleVoiceRecording={toggleVoiceRecording}
            transportUnavailable={transportUnavailable}
          />
        </>
      ) : (
        <>
          {transportUnavailable && <TransportUnavailableBanner variant="desktop" />}
          <ChatComposer
            inputAreaRef={inputAreaRef}
            chat={chat}
            companyId={companyId}
            inputValue={inputValue}
            setInputValue={setInputValue}
            isNoteMode={isNoteMode}
            setIsNoteMode={setIsNoteMode}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            emojiPickerRef={emojiPickerRef}
            pendingAttachments={pendingAttachments}
            setPendingAttachments={setPendingAttachments}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            viewerCompanyMemberId={viewerCompanyMemberId}
            viewerUserId={viewerUserId}
            isIntercepting={isIntercepting}
            isReturningToAgent={isReturningToAgent}
            onReturnToAgent={onReturnToAgent}
            handleIntercept={handleIntercept}
            handleSend={handleSend}
            handleKeyDown={handleKeyDown}
            onEmojiClick={onEmojiClick}
            handleFileChange={handleFileChange}
            voiceState={voiceState}
            isVoiceActive={isVoiceActive}
            showMicButton={showMicButton}
            voicePreviewUrl={voicePreviewUrl}
            recordingBarRef={recordingBarRef}
            elapsed={elapsed}
            confirmSendVoice={confirmSendVoice}
            discardVoice={discardVoice}
            cancelRecording={cancelRecording}
            finishRecording={finishRecording}
            onToggleVoiceRecording={toggleVoiceRecording}
            transportUnavailable={transportUnavailable}
          />
        </>
      )}
    </div>
  );
};
