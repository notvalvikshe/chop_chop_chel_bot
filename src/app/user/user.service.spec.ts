import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "./user.service";
import { UserRepository } from "./user.repository";

describe("UserService", () => {
  let service: UserService;
  let mockUserRepository: Partial<UserRepository>;

  beforeEach(async () => {
    mockUserRepository = {
      findByTelegramId: jest.fn(),
      create: jest.fn().mockResolvedValue({
        id: 1,
        telegramId: 123456789,
        firstName: "Test",
        secondName: "User",
        nickname: "testuser",
        inWhitelist: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateYClientsAuth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getUserByTelegramUser", () => {
    it("should create new user if not exists", async () => {
      (mockUserRepository.findByTelegramId as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.getUserByTelegramUser({
        id: 123456789,
        first_name: "Test",
        last_name: "User",
        username: "testuser",
      } as any);

      expect(result.telegramId).toBe(123456789);
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it("should return existing user", async () => {
      const existingUser = {
        id: 1,
        telegramId: 123456789,
        firstName: "Test",
        secondName: "User",
        nickname: "testuser",
        inWhitelist: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockUserRepository.findByTelegramId as jest.Mock).mockResolvedValue(
        existingUser,
      );

      const result = await service.getUserByTelegramUser({
        id: 123456789,
        first_name: "Test",
      } as any);

      expect(result.id).toBe(1);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });
});
