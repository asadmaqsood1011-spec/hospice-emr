import { OTP } from "otplib";

const authenticator = new OTP({ strategy: "totp" });

export function generateSecret(): string {
  return authenticator.generateSecret();
}

export function otpAuthUrl(secret: string, email: string) {
  return authenticator.generateURI({
    issuer: "Hospice EMR",
    label: email,
    secret,
    period: 30,
    digits: 6,
  });
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    const result = authenticator.verifySync({
      token,
      secret,
      period: 30,
      digits: 6,
      epochTolerance: 1,
    });
    return result.valid;
  } catch {
    return false;
  }
}
