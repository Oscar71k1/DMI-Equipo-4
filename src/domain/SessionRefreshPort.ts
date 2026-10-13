export type RefreshedTokens = Readonly<{
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}>;

export interface SessionRefreshPort {
  refresh(refreshToken: string): Promise<RefreshedTokens>;
}

export interface Clock {
  now(): number;
}