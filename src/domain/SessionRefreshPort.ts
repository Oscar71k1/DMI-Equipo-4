export type RefreshedTokens = Readonly<{
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}>;

export type SessionIdentity = Readonly<{
  actorId: string;
  role: 'reporter' | 'technician' | 'coordinator';
}>;

export interface SessionRefreshPort {
  refresh(refreshToken: string): Promise<RefreshedTokens>;
}

export interface SessionLoginPort {
  login(actorId: string): Promise<Readonly<{ identity: SessionIdentity; tokens: RefreshedTokens }>>;
}

export class SessionLoginRejectedError extends Error {
  constructor() {
    super('Session login rejected');
    this.name = 'SessionLoginRejectedError';
  }
}

export interface Clock {
  now(): number;
}
