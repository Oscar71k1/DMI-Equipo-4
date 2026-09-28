export interface SecureTokenStorage {
  save(token: string): Promise<void>;
  read(): Promise<string | null>;
  clear(): Promise<void>;
}