export interface ChannelCapability {
  name: string;
  label: string;
  description: string;
}

export interface ChannelCapabilities {
  channelType: string;
  label: string;
  description: string;
  capabilities: ChannelCapability[];
}

const CAPABILITY_REGISTRY: Record<string, ChannelCapabilities> = {
  web_chat: {
    channelType: 'web_chat',
    label: 'Website Chat',
    description: 'Real-time chat on your website',
    capabilities: [
      { name: 'messaging', label: 'Messaging', description: 'Send and receive text messages' },
      { name: 'booking', label: 'Booking', description: 'Book appointments through chat' },
      { name: 'lead_capture', label: 'Lead Capture', description: 'Automatically capture visitor information' },
    ],
  },
  whatsapp: {
    channelType: 'whatsapp',
    label: 'WhatsApp',
    description: 'WhatsApp Business messaging',
    capabilities: [
      { name: 'messaging', label: 'Messaging', description: 'Send and receive text messages' },
      { name: 'media', label: 'Media Sharing', description: 'Send and receive images, documents, and audio' },
      { name: 'booking', label: 'Booking', description: 'Book appointments through WhatsApp' },
      { name: 'lead_capture', label: 'Lead Capture', description: 'Automatically capture contact information' },
      { name: 'templates', label: 'Message Templates', description: 'Send pre-approved template messages' },
    ],
  },
  voice: {
    channelType: 'voice',
    label: 'Phone Call',
    description: 'AI-powered phone receptionist',
    capabilities: [
      { name: 'calling', label: 'Voice Calling', description: 'Make and receive phone calls' },
      { name: 'booking', label: 'Booking', description: 'Book appointments over the phone' },
    ],
  },
  sms: {
    channelType: 'sms',
    label: 'SMS',
    description: 'Text message communication',
    capabilities: [
      { name: 'messaging', label: 'Messaging', description: 'Send and receive text messages' },
      { name: 'booking', label: 'Booking', description: 'Book appointments via SMS' },
    ],
  },
};

export function getChannelCapabilities(channelType: string): ChannelCapabilities | null {
  return CAPABILITY_REGISTRY[channelType] ?? null;
}

export function getAllChannelCapabilities(): ChannelCapabilities[] {
  return Object.values(CAPABILITY_REGISTRY);
}

export function channelHasCapability(channelType: string, capability: string): boolean {
  const entry = CAPABILITY_REGISTRY[channelType];
  if (!entry) return false;
  return entry.capabilities.some(c => c.name === capability);
}

export function getSupportedChannelTypes(): string[] {
  return Object.keys(CAPABILITY_REGISTRY);
}
