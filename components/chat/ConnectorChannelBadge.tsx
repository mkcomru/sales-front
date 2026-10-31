import React from 'react';
import { Globe, MessageCircle, Unplug } from 'lucide-react';
import { connectorImageCatalogKey, resolveConnectorVisualImageSrc } from '../../utils/connectorVisual';

const WELL_CLASS = 'bg-neutral-50 ring-1 ring-black/[0.06]';

export interface ConnectorChannelBadgeProps {
  /** Backend `Connector.type` when thread is linked to a connector */
  connectorTransportType?: string | null;
  /** Thread / connector sub-channel (whatsapp, telegram, vk, …) */
  channelType?: string | null;
  size?: 'list' | 'mobile';
  /** Tailwind position classes, e.g. `bottom-0 right-0` for flush avatar corner */
  positionClass?: string;
  className?: string;
  /** No resolvable connector — show warning affordance */
  transportUnavailable?: boolean;
}

export const ConnectorChannelBadge = React.memo<ConnectorChannelBadgeProps>(
  ({
    connectorTransportType,
    channelType,
    size = 'list',
    positionClass,
    className = '',
    transportUnavailable = false,
  }) => {
    const catalogKey = connectorImageCatalogKey(connectorTransportType, channelType);
    const src = resolveConnectorVisualImageSrc(connectorTransportType, channelType);
    const outer = size === 'mobile' ? 'h-4 w-4' : 'h-5 w-5';
    const iconClass = size === 'mobile' ? 'h-3 w-3' : 'h-3.5 w-3.5';
    const pos = positionClass ?? '-bottom-1 -right-1';

    return (
      <div
        className={`absolute ${pos} ${outer} rounded-full border-2 border-white flex items-center justify-center shadow-sm overflow-hidden ${transportUnavailable ? 'bg-amber-100 ring-amber-300' : WELL_CLASS} ${className}`}
        title={transportUnavailable ? 'Канал недоступен' : undefined}
      >
        {transportUnavailable ? (
          <Unplug className={`${iconClass} text-amber-800`} strokeWidth={2.5} />
        ) : src ? (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover object-center"
            draggable={false}
          />
        ) : catalogKey === 'wappi' ? (
          <MessageCircle className={`${iconClass} text-green-600`} strokeWidth={2.5} />
        ) : (
          <Globe className={`${iconClass} text-gray-500`} strokeWidth={2.5} />
        )}
      </div>
    );
  },
);

ConnectorChannelBadge.displayName = 'ConnectorChannelBadge';
