import type { JWTPayload } from 'jose';
import * as jose from 'jose';
import { env } from '@/config/env';

export type SupabaseJWTPayload = JWTPayload & {
  sub: string;
  email?: string;
  role?: string;
  user_metadata?: Record<string, unknown>;
  is_anonymous?: boolean;
};

export const verifySupabaseJWT = async (
  token: string,
): Promise<SupabaseJWTPayload> => {
  try {
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);

    const { payload } = await jose.jwtVerify(token, secret, {
      audience: 'authenticated',
      issuer: `${env.SUPABASE_URL}/auth/v1`,
    });

    if (!payload.sub) {
      throw new Error('JWT missing subject (user ID)');
    }

    return payload as SupabaseJWTPayload;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new Error('JWT token has expired');
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      throw new Error('JWT validation failed: Invalid claims');
    }
    if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      throw new Error('JWT validation failed: Invalid signature');
    }

    throw new Error(
      `JWT validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
