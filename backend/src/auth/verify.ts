import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';

const JWT_SECRET = process.env.JWT_SECRET || 'hivagora-secret-key';

export function createToken(did: string, address: string) {
  return jwt.sign({ did, address }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function verifySignature(message: string, signature: string, expectedAddress: string): Promise<boolean> {
  try {
    const signerAddress = ethers.verifyMessage(message, signature);
    return signerAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    return false;
  }
}
