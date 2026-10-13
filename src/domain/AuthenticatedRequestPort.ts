export type AuthenticatedHttpOutcome = Readonly<{ status: number; body?: unknown }>;

export type AuthenticatedRequestResult =
  | Readonly<{ kind: 'ok'; outcome: AuthenticatedHttpOutcome }>
  | Readonly<{ kind: 'unauthenticated' }>
  | Readonly<{ kind: 'unauthorized' }>;

export interface AuthenticatedRequestPort {
  run(requestId: string, send: (accessToken: string) => Promise<AuthenticatedHttpOutcome>): Promise<AuthenticatedRequestResult>;
  getActorId(): string | null;
}
