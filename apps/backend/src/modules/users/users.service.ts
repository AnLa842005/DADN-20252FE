import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "./entity/user.schema";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async findByEmail(email: string) {
    return this.userModel
      .findOne({ email: email.trim().toLowerCase() })
      .lean()
      .exec();
  }

  async findById(id: string) {
    return this.userModel.findById(id).lean().exec();
  }

  async create(email: string, passwordHash: string) {
    const created = await this.userModel.create({
      email: email.trim().toLowerCase(),
      passwordHash,
    });
    return created.toObject();
  }
}
