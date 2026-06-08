export interface HivagoraAgent {
  did: string;
  capabilities: string[];
  reputation: number;
  stake: string;
  endpoint: string;
  owner: string;
}

export interface HubMessage {
  type: 'broadcast' | 'direct' | 'negotiate' | 'accept' | 'reject' | 'propose_bundle' | 'join_bundle';
  from: string;
  to?: string;
  content: any;
  signature?: string;
}
