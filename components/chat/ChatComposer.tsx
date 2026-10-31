import React, { RefObject } from 'react';
import {
  Bot,
  Loader2,
  MessageSquare,
  Mic,
  Paperclip,
  SendHorizontal,
  Smile,
  StickyNote,
  Unlock,
  X,
  FileText,
} from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { ChatSession } from '../../types';
import { useChatContext } from '../../contexts/ChatContext';
import { AiRoutingSkipBanner } from './AiRoutingSkipBanner';
import { showAiAssistHint, showAiInterceptBar } from '../../utils/orderAssigneeUi';
import type { ChatPendingAttachment } from '../../hooks/usePendingAttachmentUploads';
import type { ChatVoiceState } from '../../hooks/useChatVoiceCapture';
import { VoicePreviewBar } from './VoicePreviewBar';
import { VoiceRecordingBar } from './VoiceRecordingBar';

export type ChatComposerVoiceState = ChatVoiceState;
export type { ChatPendingAttachment };

export interface ChatComposerProps {
  inputAreaRef: RefObject<HTMLDivElement | null>;
  chat: ChatSession;
  companyId?: number;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  isNoteMode: boolean;
  setIsNoteMode: React.Dispatch<React.SetStateAction<boolean>>;
  showEmojiPicker: boolean;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  emojiPickerRef: RefObject<HTMLDivElement | null>;
  pendingAttachments: ChatPendingAttachment[];
  setPendingAttachments: React.Dispatch<React.SetStateAction<ChatPendingAttachment[]>>;
  isUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  viewerCompanyMemberId?: string | null;
  viewerUserId?: number | null;
  isIntercepting?: boolean;
  isReturningToAgent?: boolean;
  onReturnToAgent?: () => void;
  handleIntercept: () => void;
  handleSend: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  onEmojiClick: (emojiData: EmojiClickData) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  voiceState: ChatComposerVoiceState;
  isVoiceActive: boolean;
  showMicButton: boolean;
  voicePreviewUrl: string | null;
  recordingBarRef: RefObject<HTMLDivElement | null>;
  elapsed: number;
  confirmSendVoice: () => Promise<void>;
  discardVoice: () => void;
  cancelRecording: () => void;
  finishRecording: () => Promise<void>;
  onToggleVoiceRecording: () => Promise<void>;
  transportUnavailable?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  inputAreaRef,
  chat,
  companyId,
  inputValue,
  setInputValue,
  isNoteMode,
  setIsNoteMode,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiPickerRef,
  pendingAttachments,
  setPendingAttachments,
  isUploading,
  fileInputRef,
  viewerCompanyMemberId = null,
  viewerUserId = null,
  isIntercepting = false,
  isReturningToAgent = false,
  onReturnToAgent,
  handleIntercept,
  handleSend,
  handleKeyDown,
  onEmojiClick,
  handleFileChange,
  voiceState,
  isVoiceActive,
  showMicButton,
  voicePreviewUrl,
  recordingBarRef,
  elapsed,
  confirmSendVoice,
  discardVoice,
  cancelRecording,
  finishRecording,
  onToggleVoiceRecording,
  transportUnavailable = false,
}) => {
  const { chatState } = useChatContext();
  const routingSkip =
    chatState.aiRoutingSkip?.threadId === chat.id ? chatState.aiRoutingSkip : null;
  const interceptBar = showAiInterceptBar(chat, viewerCompanyMemberId, viewerUserId);
  const assistHint = showAiAssistHint(chat);
  const noTransportConnector = chat.connector_transport_type == null;
  return (
  <div
    ref={inputAreaRef}
    className="absolute bottom-0 left-0 right-0 px-8 pb-6 pt-2 bg-white border-t border-gray-100/80 overflow-hidden"
  >
    <div className="max-w-4xl mx-auto relative">
      <div
        className={`transition-all duration-300 ease-out ${
          interceptBar
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 pointer-events-none absolute inset-x-0 bottom-0'
        }`}
      >
        <div
          className={
            noTransportConnector
              ? 'bg-amber-50/80 border border-amber-200/70 rounded-xl p-3 flex items-center justify-between'
              : 'bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between'
          }
        >
          <div
            className={`flex items-center gap-3 ${noTransportConnector ? '' : 'text-gray-600'}`}
          >
            <div
              className={
                noTransportConnector
                  ? 'w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center'
                  : 'w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center'
              }
            >
              <Bot size={16} />
            </div>
            <span
              className={
                noTransportConnector
                  ? 'text-[13px] font-medium text-amber-800'
                  : 'text-[13px] font-medium'
              }
            >
              {noTransportConnector ? 'AI ответственный за диалог.' : 'AI ведёт диалог...'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleIntercept}
            disabled={isIntercepting}
            className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isIntercepting ? (
              <Loader2 size={14} className="text-gray-500 animate-spin" />
            ) : (
              <Unlock size={14} className="text-gray-400" />
            )}{' '}
            Перехватить
          </button>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-out ${
          !interceptBar
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2 pointer-events-none absolute inset-x-0 bottom-0'
        }`}
      >
        {routingSkip && (
          <AiRoutingSkipBanner
            threadId={routingSkip.threadId}
            reason={routingSkip.reason}
            variant="desktop"
          />
        )}
        {assistHint && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-[12px] font-medium text-indigo-800">
            <Bot size={14} className="flex-shrink-0 text-indigo-600" />
            <span>ИИ передал чат вам, но продолжает отвечать, пока вы не напишете клиенту</span>
          </div>
        )}
        <div
          className={`
              relative rounded-xl border transition-colors shadow-sm
              ${isNoteMode
                ? 'bg-bubble-note border-yellow-200 ring-1 ring-yellow-100/50'
                : 'bg-white border-gray-200 focus-within:ring-1 focus-within:ring-gray-200 focus-within:border-gray-300'}
            `}
        >
          {!isVoiceActive && (
            <div className="flex items-center gap-1 p-1.5 border-b border-black/5">
              <button
                type="button"
                onClick={() => {
                  if (!transportUnavailable) setIsNoteMode(false);
                }}
                disabled={transportUnavailable}
                title={
                  transportUnavailable
                    ? 'Канал недоступен — сообщения клиенту нельзя отправить'
                    : undefined
                }
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                  transportUnavailable
                    ? 'cursor-not-allowed opacity-45 text-gray-400'
                    : !isNoteMode
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageSquare size={12} /> Сообщение
              </button>
              <button
                type="button"
                onClick={() => setIsNoteMode(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${isNoteMode ? 'bg-yellow-100 text-yellow-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <StickyNote size={12} /> Заметка
              </button>
              {onReturnToAgent && chat.orderId && (
                <button
                  type="button"
                  onClick={onReturnToAgent}
                  disabled={isReturningToAgent}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-semibold transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  title="Вернуть диалог агенту"
                >
                  {isReturningToAgent ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Bot size={12} />
                  )}{' '}
                  Вернуть агенту
                </button>
              )}
            </div>
          )}

          {!isVoiceActive && pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3">
              {pendingAttachments.map((att, idx) => (
                <div
                  key={att.descriptor.artifact_id}
                  className="relative flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 border border-gray-200 text-[12px] text-gray-700 max-w-[180px]"
                >
                  {att.previewUrl ? (
                    <img src={att.previewUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                  ) : (
                    <FileText size={14} className="flex-shrink-0 text-gray-500" />
                  )}
                  <span className="truncate">{att.file.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingAttachments((prev) => {
                        const removed = prev[idx];
                        if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
                        return prev.filter((_, i) => i !== idx);
                      })
                    }
                    className="flex-shrink-0 ml-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
            className="pointer-events-none absolute h-px w-px opacity-0"
            onChange={handleFileChange}
          />

          {voiceState === 'preview' && voicePreviewUrl ? (
            <VoicePreviewBar
              blobUrl={voicePreviewUrl}
              onSend={() => void confirmSendVoice()}
              onDiscard={discardVoice}
              isSending={isUploading}
            />
          ) : voiceState === 'recording' ? (
            <div ref={recordingBarRef}>
              <VoiceRecordingBar
                elapsed={elapsed}
                onStop={() => void finishRecording()}
                onCancel={cancelRecording}
              />
            </div>
          ) : (
            <>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isNoteMode ? 'Напишите внутреннюю заметку...' : 'Напишите сообщение...'}
                className="chat-textarea w-full px-4 py-3.5 text-[15px] leading-relaxed text-gray-900 placeholder:text-gray-400 resize-none outline-none min-h-[52px] max-h-[120px] bg-transparent border-0 focus:ring-0 caret-gray-900 selection:bg-indigo-100 selection:text-gray-900 overflow-y-auto"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-1 text-gray-400 relative">
                  <button
                    type="button"
                    onClick={() => {
                      const input = fileInputRef.current;
                      if (!input) return;
                      if (typeof input.showPicker === 'function') {
                        input.showPicker();
                        return;
                      }
                      input.click();
                    }}
                    disabled={isUploading || !companyId || (transportUnavailable && !isNoteMode)}
                    className="p-1.5 hover:bg-black/5 rounded-md transition-colors disabled:opacity-50"
                    title={
                      transportUnavailable && !isNoteMode
                        ? 'Сначала переключитесь на заметку, чтобы прикрепить файл'
                        : 'Прикрепить файл'
                    }
                  >
                    {isUploading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Paperclip size={16} />
                    )}
                  </button>
                  <div ref={emojiPickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-1.5 hover:bg-black/5 rounded-md transition-colors ${showEmojiPicker ? 'text-gray-900 bg-gray-100' : ''}`}
                      title="Выбрать эмодзи"
                    >
                      <Smile size={16} />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 z-50 mb-2 shadow-2xl rounded-2xl overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-2 duration-200">
                        <EmojiPicker
                          onEmojiClick={onEmojiClick}
                          autoFocusSearch={false}
                          theme={Theme.LIGHT}
                          width={320}
                          height={380}
                          skinTonesDisabled
                          searchPlaceholder="Поиск..."
                          previewConfig={{ showPreview: false }}
                          categories={[
                            { category: 'suggested' as any, name: 'Недавние' },
                            { category: 'smileys_people' as any, name: 'Смайли и люди' },
                            { category: 'animals_nature' as any, name: 'Природа' },
                            { category: 'food_drink' as any, name: 'Еда и напитки' },
                            { category: 'travel_places' as any, name: 'Места' },
                            { category: 'activities' as any, name: 'Активность' },
                            { category: 'objects' as any, name: 'Предметы' },
                            { category: 'symbols' as any, name: 'Символы' },
                            { category: 'flags' as any, name: 'Флаги' },
                          ]}
                          style={
                            {
                              '--epr-picker-border-radius': '16px',
                              '--epr-emoji-size': '22px',
                              '--epr-emoji-padding': '4px',
                              '--epr-category-navigation-button-size': '24px',
                              '--epr-header-padding': '12px 12px 6px 12px',
                              '--epr-search-input-padding': '8px 12px 8px 36px',
                              '--epr-search-input-border-radius': '10px',
                            } as React.CSSProperties
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
                {showMicButton ? (
                  <button
                    type="button"
                    onClick={() => void onToggleVoiceRecording()}
                    disabled={!companyId || isNoteMode}
                    className="p-2 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all touch-none"
                    title="Записать голосовое"
                  >
                    <Mic size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputValue.trim() && pendingAttachments.length === 0}
                    className={`
                              p-2 rounded-lg flex items-center justify-center transition-all
                              ${inputValue.trim() || pendingAttachments.length > 0
                        ? 'bg-gray-900 text-white shadow-sm hover:bg-black'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                            `}
                  >
                    <SendHorizontal size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};
