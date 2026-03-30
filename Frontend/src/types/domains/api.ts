export interface ApiError {
  message?: string;
  error?: string;
  type?: string;
  title?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
