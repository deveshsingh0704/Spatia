export interface AuthUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
  token_type: string;
  expires_in: number;
}
