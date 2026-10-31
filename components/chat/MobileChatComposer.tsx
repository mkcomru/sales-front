import React, { RefObject, useState } from 'react';
import {
  Bot,
  FileText,
  Loader2,
  MessageSquareText,
  Mic,
  Paperclip,
  Plus,
  SendHorizontal,
  Smile,
  StickyNote,
  Unlock,
  X,
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

export interface MobileChatComposerProps {
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
  voiceState: ChatVoiceState;
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

export const MobileChatComposer: React.FC<MobileChatComposerProps> = ({
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
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const routingSkip =
    chatState.aiRoutingSkip?.threadId === chat.id ? chatState.aiRoutingSkip : null;
  const interceptBar = showAiInterceptBar(chat, viewerCompanyMemberId, viewerUserId);
  const assistHint = showAiAssistHint(chat);
  const noTransportConnector = chat.connector_transport_type == null;

  const closeActions = () => setIsActionSheetOpen(false);
  const openFilePicker = () => {
    const input = fileInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.click();
  };

  return (
    <>
      <div
        ref={inputAreaRef}
        className="relative z-20 shrink-0 border-t border-gray-100 bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-2.5"
      >
        {interceptBar ? (
          <div
            className={
              noTransportConnector
                ? 'rounded-2xl border border-amber-200/70 bg-amber-50/80 px-3 py-3'
                : 'rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3'
            }
          >
            <div className="flex items-center gap-3">
              <div
                className={
                  noTransportConnector
                    ? 'flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700'
                    : 'flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600'
                }
              >
                <Bot size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={
                    noTransportConnector
                      ? 'text-[13px] font-semibold text-amber-800'
                      : 'text-[13px] font-semibold text-gray-900'
                  }
                >
                  {noTransportConnector ? 'AI ответственный за диалог.' : 'AI ведёт диалог...'}
                </div>
                <div className="text-[12px] text-gray-500">Чтобы ответить самому, сначала перехватите чат</div>
              </div>
              <button
                type="button"
                onClick={handleIntercept}
                disabled={isIntercepting}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-gray-900 px-4 text-[13px] font-semibold text-white disabled:opacity-70"
              >
                {isIntercepting ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                Перехватить
              </button>
            </div>
          </div>
        ) : (
          <>
            {routingSkip && (
              <AiRoutingSkipBanner
                threadId={routingSkip.threadId}
                reason={routingSkip.reason}
                variant="mobile"
              />
            )}
            {assistHint && (
              <div className="mb-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-[12px] font-medium text-indigo-900">
                ИИ передал чат вам, но продолжает отвечать, пока вы не напишете клиенту
              </div>
            )}
            {isNoteMode && !isVoiceActive && (
              <div className="mb-2 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900">
                <div className="flex items-center gap-2">
                  <StickyNote size={14} />
                  Режим заметки
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!transportUnavailable) setIsNoteMode(false);
                  }}
                  disabled={transportUnavailable}
                  className="rounded-full p-1 text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Закрыть режим заметки"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="rounded-[26px] border border-gray-200 bg-white shadow-sm">
              {!isVoiceActive && pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pt-3">
                  {pendingAttachments.map((att, idx) => (
                    <div
                      key={att.descriptor.artifact_id}
                      className="flex max-w-[180px] items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-[12px] text-gray-700"
                    >
                      {att.previewUrl ? (
                        <img src={att.previewUrl} alt="" className="h-7 w-7 rounded-xl object-cover" />
                      ) : (
                        <FileText size={14} className="text-gray-500" />
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
                        className="text-gray-400 hover:text-gray-700"
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
                    className="chat-textarea max-h-[132px] min-h-[56px] w-full resize-none border-0 bg-transparent px-4 py-3 text-[16px] leading-[1.4] text-gray-900 outline-none placeholder:text-gray-400"
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                  <div className="flex items-center justify-between px-2 pb-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setIsActionSheetOpen(true)}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                        aria-label="Открыть действия"
                      >
                        <Plus size={18} />
                      </button>
                      <div ref={emojiPickerRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker((prev) => !prev)}
                          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                            showEmojiPicker ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100'
                          }`}
                          aria-label="Выбрать эмодзи"
                        >
                          <Smile size={18} />
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-full left-0 z-50 mb-2 overflow-hidden rounded-3xl border border-gray-100 shadow-2xl">
                            <EmojiPicker
                              onEmojiClick={onEmojiClick}
                              autoFocusSearch={false}
                              theme={Theme.LIGHT}
                              width={320}
                              height={360}
                              skinTonesDisabled
                              searchPlaceholder="Поиск..."
                              previewConfig={{ showPreview: false }}
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
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-white disabled:opacity-50"
                        aria-label="Записать голосовое"
                      >
                        <Mic size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!inputValue.trim() && pendingAttachments.length === 0}
                        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                          inputValue.trim() || pendingAttachments.length > 0
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                        aria-label="Отправить"
                      >
                        <SendHorizontal size={18} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {isActionSheetOpen && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/25" onClick={closeActions}>
          <div
            className="animate-mobile-sheet-in w-full rounded-t-[28px] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />
            <div className="space-y-2">
              <ActionSheetButton
                icon={<Paperclip size={18} />}
                label="Прикрепить файл"
                disabled={isUploading || !companyId || (transportUnavailable && !isNoteMode)}
                onClick={() => {
                  openFilePicker();
                  closeActions();
                }}
              />
              <ActionSheetButton
                icon={<StickyNote size={18} />}
                label="Внутренняя заметка"
                onClick={() => {
                  setIsNoteMode(true);
                  closeActions();
                }}
              />
              {onReturnToAgent && chat.orderId && (
                <ActionSheetButton
                  icon={isReturningToAgent ? <Loader2 size={18} className="animate-spin" /> : <MessageSquareText size={18} />}
                  label="Вернуть агенту"
                  disabled={isReturningToAgent}
                  onClick={() => {
                    closeActions();
                    onReturnToAgent();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ActionSheetButton = React.memo<{
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}>(({ icon, label, disabled = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-4 py-4 text-left text-[15px] font-medium text-gray-900 transition-colors hover:bg-gray-100 disabled:opacity-50"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-gray-700 shadow-sm">
      {icon}
    </div>
    <span>{label}</span>
  </button>
));

ActionSheetButton.displayName = 'ActionSheetButton';
