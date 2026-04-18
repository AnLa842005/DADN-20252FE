import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { PassportStrategy } from "@nestjs/passport";
import { Model } from "mongoose";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtAccessPayload } from "./auth.types";
import { Session } from "./entity/session.schema";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_ACCESS_SECRET") ?? "dev_access_secret",
    });
  }

  async validate(payload: JwtAccessPayload) {
    if (!payload || payload.typ !== "access" || !payload.sub || !payload.sid) {
      throw new UnauthorizedException("Invalid access token");
    }

    const session = await this.sessionModel.findOne({ sessionId: payload.sid }).lean().exec();
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Session expired");
    }

    return { userId: payload.sub, email: payload.email, sid: payload.sid };
  }
}

