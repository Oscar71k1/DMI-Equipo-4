export type HttpResponse = Readonly<{
  status: number;
  headers?: Readonly<Record<string, string>>;
  json: () => Promise<unknown>;
}>;

export type HttpRequest = Readonly<{
  method: 'GET' | 'POST';
  path: string;
  headers?: Readonly<Record<string, string>>;
  body?: unknown;
  signal?: AbortSignal;
}>;

export interface HttpTransport {
  request(request: HttpRequest): Promise<HttpResponse>;
}