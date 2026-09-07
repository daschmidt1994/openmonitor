/** Consistent error envelope returned by every apps/api error response. */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
  requestId?: string;
}
