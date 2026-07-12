import Sodium from 'react-native-libsodium';

export interface EncryptionKeyPair {
  publicKey: string;
  privateKey: string;
}

export async function generateEncryptionKeyPair(): Promise<EncryptionKeyPair> {
  try {
    // Generate X25519 public/private key pair
    await Sodium.ready;
    const keyPair = Sodium.crypto_box_keypair();
    return {
      publicKey: Sodium.to_base64(keyPair.publicKey),
      privateKey: Sodium.to_base64(keyPair.privateKey),
    };
  } catch (error) {
    console.error('Failed to generate encryption key pair:', error);
    throw new Error('Could not generate encryption key pair');
  }
}

export const createKeys = async () => {
  const keys = await generateEncryptionKeyPair();
  return keys;
};