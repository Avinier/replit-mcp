/**
 * Types for Replit Auth API integration
 */

export interface AuthenticatedUser {
  id: number;
}

export interface AuthenticatedInstallation {
  id: number;
}

export interface AuthenticateResult {
  installation: AuthenticatedInstallation;
  user: AuthenticatedUser;
}

export interface AuthTokenPayload {
  sub: string; // Subject (user ID)
  iat: number; // Issued at
  exp: number; // Expiration
  iss: string; // Issuer
  aud: string; // Audience
  scope?: string; // Granted scopes
}

export interface AuthTokenHeader {
  alg: string; // Algorithm
  typ: string; // Type
  kid?: string; // Key ID
}

export interface VerifyTokenResult {
  payload: AuthTokenPayload;
  protectedHeader: AuthTokenHeader;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: AuthenticatedUser;
  installation?: AuthenticatedInstallation;
  token?: string;
  expiresAt?: number;
}

export interface AuthError {
  code: 'AUTH_FAILED' | 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'NETWORK_ERROR';
  message: string;
  details?: any;
}

export interface AuthOptions {
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
  autoRefresh?: boolean;
}

// MCP Tool input types
export interface ReplitAuthenticateInput {
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
}

export interface ReplitVerifyTokenInput {
  token: string;
}

export interface ReplitGetTokenInput {
  // No input required
}

// MCP Resource types
export interface AuthResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}