export type TTokenPayload = {
  userId: number;
  exp: number;
  tokenVersion?: number;
};

export type TConnectionInfo = {
  ip?: string;
  os?: string;
  device?: string;
  userAgent?: string;
};
