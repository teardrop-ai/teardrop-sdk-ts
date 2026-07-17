import type { HttpTransport } from "./transport";
import type {
  MeResponse,
  TokenResponse,
  AuthMeResponse,
  SiweNonceResponse,
  VerifyEmailResponse,
  ResendVerificationResponse,
  CreateInviteRequest,
  CreateInviteResponse,
} from "./types";

export class AuthModule {
  constructor(private readonly http: HttpTransport) {}

  /** Exchange credentials for a JWT. Supports email+secret, client_credentials, or SIWE. */
  async login(
    params:
      | { email: string; secret: string }
      | { client_id: string; client_secret: string }
      | { siwe_message: string; siwe_signature: string },
  ): Promise<TokenResponse> {
    const data = await this.http.request<TokenResponse>("POST", "/token", {
      body: params,
      auth: false,
    });
    if (data.access_token) {
      this.http.setToken(data.access_token);
    }
    return data;
  }

  /** Self-serve org + user registration. */
  async register(params: {
    org_name: string;
    email: string;
    password: string;
  }): Promise<TokenResponse> {
    const data = await this.http.request<TokenResponse>("POST", "/register", {
      body: params,
      auth: false,
    });
    if (data.access_token) {
      this.http.setToken(data.access_token);
    }
    return data;
  }

  /** Accept org invite and create user. */
  async registerInvite(params: {
    token: string;
    email: string;
    password: string;
  }): Promise<TokenResponse> {
    const data = await this.http.request<TokenResponse>(
      "POST",
      "/register/invite",
      { body: params, auth: false },
    );
    if (data.access_token) {
      this.http.setToken(data.access_token);
    }
    return data;
  }

  /** Return decoded token claims for the current session, plus org_name from the database. */
  async me(): Promise<AuthMeResponse> {
    return this.http.request<AuthMeResponse>("GET", "/auth/me");
  }

  /** Fetch a single-use nonce for SIWE sign-in. */
  async siweNonce(): Promise<SiweNonceResponse> {
    return this.http.request<SiweNonceResponse>("GET", "/auth/siwe/nonce", {
      auth: false,
    });
  }

  /** Rotate refresh token for new access token. */
  async refresh(refreshToken: string): Promise<TokenResponse> {
    const data = await this.http.request<TokenResponse>("POST", "/auth/refresh", {
      body: { refresh_token: refreshToken },
      auth: false,
    });
    if (data.access_token) {
      this.http.setToken(data.access_token);
    }
    return data;
  }

  /** Revoke a refresh token. */
  async logout(refreshToken: string): Promise<void> {
    await this.http.request<void>("POST", "/auth/logout", {
      body: { refresh_token: refreshToken },
    });
  }

  /** Verify email with one-time token. */
  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    return this.http.request<VerifyEmailResponse>(
      "GET",
      "/auth/verify-email",
      { params: { token }, auth: false },
    );
  }

  /** Resend verification email. */
  async resendVerification(email: string): Promise<ResendVerificationResponse> {
    return this.http.request<ResendVerificationResponse>(
      "POST",
      "/auth/resend-verification",
      { body: { email }, auth: false },
    );
  }

  /** Create org invite link. */
  async invite(params: CreateInviteRequest): Promise<CreateInviteResponse> {
    return this.http.request<CreateInviteResponse>("POST", "/org/invite", { body: params });
  }
}
