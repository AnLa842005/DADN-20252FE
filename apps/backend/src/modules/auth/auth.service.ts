import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { Model, Types } from "mongoose";
import { UsersService } from "../users/users.service";
import { Session } from "./entity/session.schema";
import { AuthTokens, AuthUser, JwtAccessPayload, JwtRefreshPayload } from "./auth.types";
import { parseTtlSeconds, sha256 } from "./auth.util";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {}

  private accessSecret(): string {
    return this.configService.get<string>("JWT_ACCESS_SECRET") ?? "dev_access_secret";
  }

  private refreshSecret(): string {
    return this.configService.get<string>("JWT_REFRESH_SECRET") ?? "dev_refresh_secret";
  }

  private accessTtlSeconds(): number {
    return parseTtlSeconds(this.configService.get<string>("JWT_ACCESS_TTL"), 15 * 60);
  }

  private refreshTtlSeconds(): number {
    return parseTtlSeconds(this.configService.get<string>("JWT_REFRESH_TTL"), 30 * 24 * 60 * 60);
  }

  private toAuthUser(user: { _id?: unknown; id?: string; email: string }): AuthUser {
    const id = (user.id ?? String((user as any)._id)) as string;
    return { id, email: user.email };
  }

  private async issueTokensForUser(userId: string, email: string): Promise<AuthTokens> {
    const sessionId = randomUUID();
    const accessPayload: JwtAccessPayload = { sub: userId, email, sid: sessionId, typ: "access" };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.accessSecret(),
      expiresIn: this.accessTtlSeconds(),
    });

    const refreshPayload: JwtRefreshPayload = { sub: userId, sid: sessionId, typ: "refresh" };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.refreshSecret(),
      expiresIn: this.refreshTtlSeconds(),
    });

    await this.sessionModel.create({
      sessionId,
      userId: new Types.ObjectId(userId),
      refreshTokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + this.refreshTtlSeconds() * 1000),
    });

    return { accessToken, refreshToken };
  }

  async register(email: string, password: string) {
    const existed = await this.usersService.findByEmail(email);
    if (existed) {
      throw new UnauthorizedException("Email already registered");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.create(email, passwordHash);
    const authUser = this.toAuthUser(user as any);
    const tokens = await this.issueTokensForUser(authUser.id, authUser.email);
    return { ...tokens, user: authUser };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await bcrypt.compare(password, (user as any).passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const authUser = this.toAuthUser(user as any);
    const tokens = await this.issueTokensForUser(authUser.id, authUser.email);
    return { ...tokens, user: authUser };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (payload.typ !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokenHash = sha256(refreshToken);
    const session = await this.sessionModel
      .findOne({ sessionId: payload.sid, refreshTokenHash: tokenHash })
      .exec();
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh session expired");
    }

    // Rotate refresh token: revoke old session and issue new tokens.
    session.revokedAt = new Date();
    await session.save();

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException("User not found");
    const authUser = this.toAuthUser(user as any);
    return this.issueTokensForUser(authUser.id, authUser.email);
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (payload.typ !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.sessionModel.updateOne(
      { sessionId: payload.sid, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    return { ok: true };
  }
}

