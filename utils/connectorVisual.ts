import telegramImg from '../assets/connectors/telegram.png';
import wappiWhatsappImg from '../assets/connectors/wappi-whatsapp.png';
import wappiTelegramImg from '../assets/connectors/wappi-telegram.png';
import wappiVkImg from '../assets/connectors/wappi-vk.png';

const CONNECTOR_VISUAL_IMAGES: Record<string, string> = {
  telegram: telegramImg,
  'wappi-whatsapp': wappiWhatsappImg,
  'wappi-telegram': wappiTelegramImg,
  'wappi-vk': wappiVkImg,
};

/**
 * Same rules as ChannelsSettings.getConnectorPreviewImage — transport `type` + connector `channel_type`.
 */
export function connectorImageCatalogKey(
  connectorTransportType: string | null | undefined,
  channelType: string | null | undefined,
): string | undefined {
  const ct = channelType ?? '';
  if (connectorTransportType === 'telegram') return 'telegram';
  if (connectorTransportType === 'wappi') {
    if (ct === 'whatsapp') return 'wappi-whatsapp';
    if (ct === 'telegram') return 'wappi-telegram';
    if (ct === 'vk') return 'wappi-vk';
    return 'wappi';
  }
  if (connectorTransportType === 'wazzup') return 'wazzup';
  if (connectorTransportType === 'custom') return 'custom';
  if (ct === 'telegram') return 'telegram';
  if (ct === 'whatsapp') return 'wappi-whatsapp';
  if (ct === 'vk') return 'wappi-vk';
  if (ct === 'wappi') return 'wappi';
  return undefined;
}

export function resolveConnectorVisualImageSrc(
  connectorTransportType: string | null | undefined,
  channelType: string | null | undefined,
): string | undefined {
  const key = connectorImageCatalogKey(connectorTransportType, channelType);
  if (!key) return undefined;
  return CONNECTOR_VISUAL_IMAGES[key];
}
