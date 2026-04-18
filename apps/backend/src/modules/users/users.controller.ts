import { Controller, Get, Req } from "@nestjs/common";

type JwtRequestUser = {
  userId: string;
  email: string;
};

@Controller()
export class UsersController {
  @Get("me")
  me(@Req() req: { user?: JwtRequestUser }) {
    const email = req.user?.email ?? "";
    const displayName = email.includes("@") ? email.split("@")[0] : email || "User";
    return {
      id: req.user?.userId ?? "",
      email,
      displayName,
    };
  }
}

