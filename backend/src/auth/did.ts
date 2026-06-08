import { ethers } from 'ethers';

export function generateDid(address: string): string {
  return `did:hivagora:${address.toLowerCase()}`;
}

export function extractAddressFromDid(did: string): string {
  const parts = did.split(':');
  if (parts.length !== 3 || parts[1] !== 'hivagora') {
    throw new Error('Invalid DID format');
  }
  return parts[2];
}
