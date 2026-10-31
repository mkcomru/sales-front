import React from 'react';
import { Bot, Sparkles, StickyNote, User } from 'lucide-react';
import { Message, MessageType } from '../../types';
import { ArtifactDocumentLink } from './ArtifactDocumentLink';
import { ArtifactImageDisplay } from './ArtifactImageDisplay';
import { VoiceMessageBar } from './VoiceMessageBar';
import { isDocumentArtifactId, isImageArtifactId, isVoiceArtifactId } from '../../utils/artifactKinds';
import { voiceBubbleSurface } from '../../utils/voiceBubbleSurface';
import { getAuthorInitials, getAuthorLabel } from './messageAuthorLabel';
import { getBubbleStyleInfo, type TranscriptBubbleVariant } from './messageBubbleStyles';
import { messageBodyText } from '../../utils/messageBodyText';

const IMAGE_PLACEHOLDER_RE = /^(\[?(фото|изображение|image|photo)\]?|🖼|📷)$/i;

export interface MessageBubbleGroupProps {
  messages: Message[];
  newMessageIds?: Set<string>;
  companyId?: number;
  variant: TranscriptBubbleVariant;
}

export const MessageBubbleGroup = React.memo<MessageBubbleGroupProps>(
  ({ messages, newMessageIds, companyId, variant }) => {
    if (!messages.length) return null;

    const first = messages[0];
    const firstStyle = getBubbleStyleInfo(first, variant);
    const { isClient, isAi, isNote, isManager } = firstStyle;
    const alignClass = isClient ? 'items-start' : 'items-end';
    const animClass = 'animate-msg-enter';

    if (variant === 'mobile') {
      return (
        <div className={`flex flex-col ${alignClass} gap-0.5 w-full`}>
          <div className={`flex items-center gap-1.5 mb-0.5 ${isClient ? '' : 'flex-row-reverse'}`}>
            {isAi && (
              <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 relative">
                <Bot size={12} />
                <div className="absolute -top-1 -right-1 bg-indigo-500 text-white rounded-full p-[2px]">
                  <Sparkles size={5} />
                </div>
              </div>
            )}
            {isNote && (
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <StickyNote size={12} />
              </div>
            )}
            {isManager && (
              <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center flex-shrink-0 text-[9px] font-bold">
                {getAuthorInitials(first.senderName || 'M')}
              </div>
            )}
            <span className="text-[11px] text-gray-400 font-medium">{getAuthorLabel(first, variant)}</span>
          </div>

          <div className={`flex flex-col gap-1 max-w-[78%] ${isClient ? 'items-start' : 'items-end'}`}>
            {messages.map((msg) => {
              const { bubbleClass: cls, isFailed } = getBubbleStyleInfo(msg, variant);
              const voices = (msg.artifact_ids ?? []).filter(isVoiceArtifactId);
              const images = (msg.artifact_ids ?? []).filter(isImageArtifactId);
              const documents = (msg.artifact_ids ?? []).filter(isDocumentArtifactId);
              const body = messageBodyText(msg);
              const contentTrimmed = body.trim();
              const isImgPlaceholder =
                images.length > 0 && IMAGE_PLACEHOLDER_RE.test(contentTrimmed);
              const showContent = body && !isImgPlaceholder;
              const isClientMsg = getBubbleStyleInfo(msg, variant).isClient;
              const errorText =
                msg.metadata?.error || msg.metadata?.description || 'Не удалось отправить сообщение';

              return (
                <div
                  key={msg.clientId ?? msg.id}
                  className={`flex flex-col ${isClientMsg ? 'items-start' : 'items-end'} gap-0.5 ${newMessageIds?.has(msg.clientId ?? msg.id) ? animClass : ''}`}
                >
                  <div className={`px-3.5 py-2.5 text-[15px] leading-[1.45] shadow-sm ${cls}`}>
                    {showContent && (
                      <span className="whitespace-pre-wrap break-words">{body}</span>
                    )}
                    {companyId && images.length > 0 && (
                      <div
                        className={`mt-1.5 grid gap-1.5 ${
                          images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                        }`}
                      >
                        {images.map((id) => (
                          <ArtifactImageDisplay
                            key={id}
                            companyId={companyId}
                            artifactId={id}
                            variant={variant}
                            imageCount={images.length}
                          />
                        ))}
                      </div>
                    )}
                    {companyId && voices.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-1">
                        {voices.map((id) => (
                          <VoiceMessageBar
                            key={id}
                            companyId={companyId}
                            artifactId={id}
                            surface={voiceBubbleSurface(msg)}
                          />
                        ))}
                      </div>
                    )}
                    {companyId && documents.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-1">
                        {documents.map((id) => (
                          <ArtifactDocumentLink key={id} companyId={companyId} artifactId={id} />
                        ))}
                      </div>
                    )}
                  </div>
                  {isFailed && (
                    <span className="px-1 text-[11px] text-red-500">{errorText}</span>
                  )}
                  <div className="px-1 text-[11px] text-gray-400">{msg.timestamp || '—'}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className={`flex flex-col ${alignClass} w-full group`}>
        <div className={`flex items-end gap-2 max-w-[80%] ${isClient ? '' : 'flex-row-reverse'}`}>
          {isAi && (
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-100 relative">
              <Bot size={14} />
              <div className="absolute -top-1 -right-1 bg-indigo-500 text-white rounded-full p-0.5 border border-indigo-50">
                <Sparkles size={6} />
              </div>
            </div>
          )}
          {isNote && (
            <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center flex-shrink-0 border border-yellow-200">
              <StickyNote size={14} />
            </div>
          )}
          {isManager && (
            <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center flex-shrink-0 border border-gray-900">
              <User size={14} />
            </div>
          )}

          <div className="flex flex-col gap-1 min-w-0">
            <span
              className={`text-[10px] font-bold text-gray-500 mb-0.5 px-1 ${isClient ? 'text-left' : 'text-right'}`}
            >
              {getAuthorLabel(first, variant)}
            </span>

            <div className="flex flex-col gap-1.5">
              {messages.map((msg) => {
                const { bubbleClass: bc, isFailed: failed, isClient: isClientMsg } = getBubbleStyleInfo(
                  msg,
                  variant,
                );
                const errorText =
                  msg.metadata?.error || msg.metadata?.description || 'Unknown Transport Error';
                const wrapCls = newMessageIds?.has(msg.clientId ?? msg.id) ? animClass : '';
                const voiceArtifacts = (msg.artifact_ids ?? []).filter(isVoiceArtifactId);
                const imageArtifacts = (msg.artifact_ids ?? []).filter(isImageArtifactId);
                const documentArtifacts = (msg.artifact_ids ?? []).filter(isDocumentArtifactId);
                const body = messageBodyText(msg);
                const contentTrimmed = body.trim();
                const isImagePlaceholder =
                  imageArtifacts.length > 0 && IMAGE_PLACEHOLDER_RE.test(contentTrimmed);
                const showContent = body && !isImagePlaceholder;

                return (
                  <div key={msg.clientId ?? msg.id} className={`flex flex-col gap-0.5 ${wrapCls}`}>
                    <div
                      className={`px-4 py-2.5 text-[14px] leading-relaxed shadow-sm ${bc} ${isClientMsg ? 'whitespace-pre-line' : ''}`}
                    >
                      {showContent ? <div className="mb-2">{body}</div> : null}
                      {companyId && imageArtifacts.length > 0 && (
                        <div
                          className={`mb-2 grid gap-1.5 ${
                            imageArtifacts.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                          }`}
                        >
                          {imageArtifacts.map((aid) => (
                            <ArtifactImageDisplay
                              key={aid}
                              companyId={companyId}
                              artifactId={aid}
                              variant={variant}
                              imageCount={imageArtifacts.length}
                            />
                          ))}
                        </div>
                      )}
                      {companyId && voiceArtifacts.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {voiceArtifacts.map((aid) => (
                            <VoiceMessageBar
                              key={aid}
                              companyId={companyId}
                              artifactId={aid}
                              surface={voiceBubbleSurface(msg)}
                            />
                          ))}
                        </div>
                      )}
                      {companyId && documentArtifacts.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {documentArtifacts.map((aid) => (
                            <ArtifactDocumentLink key={aid} companyId={companyId} artifactId={aid} />
                          ))}
                        </div>
                      )}
                    </div>
                    {failed && (
                      <div
                        className={`text-[11px] text-red-500 font-medium flex items-center gap-1 ${isClient ? 'text-left ml-1' : 'text-right justify-end mr-1'}`}
                      >
                        ❌ {errorText}
                      </div>
                    )}
                    <div
                      className={`text-[10px] text-gray-400 transition-opacity ${isClient ? 'text-left ml-1' : 'text-right mr-1'}`}
                    >
                      {msg.timestamp || '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

MessageBubbleGroup.displayName = 'MessageBubbleGroup';
