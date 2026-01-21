import { Test, TestingModule } from "@nestjs/testing";
import { BookingRepository } from "./booking.repository";
import { DBService } from "../../db/db.service";

describe("BookingRepository", () => {
  let repository: BookingRepository;
  let mockDBService: any;

  beforeEach(async () => {
    mockDBService = {
      db: {
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([
          {
            id: 1,
            userId: 1,
            yclientsRecordId: 123456,
            companyId: 1718848,
            companyName: "ЧОП ЧОП",
            serviceId: 1,
            serviceName: "Стрижка",
            staffId: 1,
            staffName: "Петр",
            datetime: new Date(),
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingRepository,
        { provide: DBService, useValue: mockDBService },
      ],
    }).compile();

    repository = module.get<BookingRepository>(BookingRepository);
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("create", () => {
    it("should create booking record", async () => {
      const data = {
        userId: 1,
        yclientsRecordId: 123456,
        companyId: 1718848,
        companyName: "ЧОП ЧОП",
        serviceId: 1,
        serviceName: "Стрижка",
        staffId: 1,
        staffName: "Петр",
        datetime: new Date(),
      };

      const result = await repository.create(data);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockDBService.db.insert).toHaveBeenCalled();
    });
  });

  describe("getActiveBookings", () => {
    it("should return active bookings for user", async () => {
      const result = await repository.getActiveBookings(1);

      expect(mockDBService.db.select).toHaveBeenCalled();
      expect(mockDBService.db.where).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
