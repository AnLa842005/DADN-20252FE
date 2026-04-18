export type JwtAccessPayload = {
  sub: string;
  email: string;
  sid: string;
  typ: "access";
};

export type JwtRefreshPayload = {
  sub: string;
  sid: string;
  typ: "refresh";
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthUser = {
  id: string;
  email: string;
};

