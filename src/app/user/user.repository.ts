import { Injectable } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { DBService } from "../../db/db.service";
import { userSchema } from "../../db/schema";
import { User } from "./user";

@Injectable()
export class UserRepository {
  constructor(private dbService: DBService) {}

  public async create(userCreateData: {
    telegramId: number;
    firstName: string;
    nickname?: string;
    secondName?: string;
  }): Promise<User> {
    const model = await this.dbService.db
      .insert(userSchema)
      .values({
        firstName: userCreateData.firstName,
        telegramId: userCreateData.telegramId,
        nickname: userCreateData.nickname,
        secondName: userCreateData.secondName,
      })
      .onConflictDoUpdate({
        set: {
          firstName: userCreateData.firstName,
          nickname: userCreateData.nickname,
          secondName: userCreateData.secondName,
        },
        target: userSchema.telegramId,
      })
      .returning();
    return new User(model[0]);
  }

  public async findByTelegramId(telegramId: number): Promise<User | null> {
    const model = await this.dbService.db
      .select()
      .from(userSchema)
      .where(eq(userSchema.telegramId, telegramId))
      .limit(1);
    return model.length ? new User(model[0]) : null;
  }

  public async findById(id: number): Promise<User | null> {
    const model = await this.dbService.db
      .select()
      .from(userSchema)
      .where(eq(userSchema.id, id))
      .limit(1);
    return model.length ? new User(model[0]) : null;
  }

  public async findByIds(ids: number[]): Promise<User[]> {
    const model = await this.dbService.db
      .select()
      .from(userSchema)
      .where(inArray(userSchema.id, ids));
    return model.length ? model.map((item) => new User(item)) : [];
  }

  public async updateYClientsAuth(
    userId: number,
    userToken: string,
    yclientsUserId: number,
    phone: string,
  ): Promise<User | null> {
    const model = await this.dbService.db
      .update(userSchema)
      .set({
        yclientsUserToken: userToken,
        yclientsUserId: yclientsUserId,
        yclientsPhone: phone,
      })
      .where(eq(userSchema.id, userId))
      .returning();
    return model.length ? new User(model[0]) : null;
  }

  public async updateContactInfo(
    userId: number,
    phone: string,
    email: string,
  ): Promise<User | null> {
    const model = await this.dbService.db
      .update(userSchema)
      .set({
        yclientsPhone: phone,
        yclientsEmail: email,
      })
      .where(eq(userSchema.id, userId))
      .returning();
    return model.length ? new User(model[0]) : null;
  }
}
