export type HttpResponse = Readonly<{
  status: number;
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