import * as SecureStore from 'expo-secure-store';
import type { SecureTokenStorage } from '../domain/SecureTokenStorage';

const KEY = 'campusops.session.token';
const OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export function createExpoSecureTokenStorage(): SecureTokenStorage {
  return {
    save: (token) => SecureStore.setItemAsync(KEY, token, OPTIONS),
    read: () => SecureStore.getItemAsync(KEY, OPTIONS),
    clear: () => SecureStore.deleteItemAsync(KEY, OPTIONS),
  };
}
