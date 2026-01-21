import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { BookingService } from "./booking.service";
import { BookingRepository } from "./booking.repository";
import { YClientsApiService } from "../../yclients/yclients-api.service";

describe("BookingService", () => {
  let service: BookingService;
  let mockYClientsApi: Partial<YClientsApiService>;
  let mockBookingRepository: Partial<BookingRepository>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockYClientsApi = {
      listServices: jest
        .fn()
        .mockResolvedValue([
          {
            id: 1,
            title: "Стрижка",
            duration: 1800,
            price_min: 500,
            price_max: 1000,
            is_online: true,
          },
        ]),
      listStaff: jest
        .fn()
        .mockResolvedValue([{ id: 1, name: "Петр", specialization: "Барбер", fired: 0, hidden: 0 }]),
      getFreeTimes: jest
        .fn()
        .mockResolvedValue([
          {
            time: "10:00",
            datetime: "2026-01-22T10:00:00+05:00",
            seance_length: 30,
          },
        ]),
      createRecord: jest.fn().mockResolvedValue([{ id: 0, record_id: 123456 }]),
    };

    mockBookingRepository = {
      create: jest.fn().mockResolvedValue({
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
      }),
      getActiveBookings: jest.fn().mockResolvedValue([]),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === "YCLIENTS_COMPANY_ID") return 1718848;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: YClientsApiService, useValue: mockYClientsApi },
        { provide: BookingRepository, useValue: mockBookingRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getAvailableServices", () => {
    it("should return list of online services", async () => {
      const services = await service.getAvailableServices();

      expect(services).toHaveLength(1);
      expect(services[0].title).toBe("Стрижка");
      expect(mockYClientsApi.listServices).toHaveBeenCalledWith(1718848);
    });
  });

  describe('getStaffForService', () => {
    it('should return list of staff for service', async () => {
      const staff = await service.getStaffForService(1);

      expect(staff).toHaveLength(1);
      expect(staff[0].name).toBe("Петр");
      expect(mockYClientsApi.listStaff).toHaveBeenCalledWith(1718848, [1]);
    });
  });

  describe("getAvailableSlots", () => {
    it("should return available time slots", async () => {
      const slots = await service.getAvailableSlots(1, 1, "2026-01-22");

      expect(slots).toHaveLength(1);
      expect(slots[0].time).toBe("10:00");
      expect(mockYClientsApi.getFreeTimes).toHaveBeenCalled();
    });
  });

  describe("createBooking", () => {
    it("should create booking and save to database", async () => {
      const user = {
        id: 1,
        telegramId: 123456789,
        firstName: "Test",
        yclientsPhone: "+71234567890",
      };

      const result = await service.createBooking(
        1,
        1,
        '2026-01-22T10:00:00+05:00',
        user as any,
      );

      expect(mockYClientsApi.createRecord).toHaveBeenCalled();
      expect(mockBookingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          yclientsRecordId: 123456,
          companyId: 1718848,
          companyName: "ЧОП ЧОП",
          serviceId: 1,
        }),
      );
    });
  });

  describe("getUserBookings", () => {
    it("should return user bookings from database", async () => {
      const mockBooking = {
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
      };

      (mockBookingRepository.getActiveBookings as jest.Mock).mockResolvedValue([
        mockBooking,
      ]);

      const bookings = await service.getUserBookings(1);

      expect(bookings).toHaveLength(1);
      expect(bookings[0].services[0].title).toBe("Стрижка");
      expect((bookings[0] as any).staff_name).toBe("Петр");
      expect((bookings[0] as any).company_name).toBe("ЧОП ЧОП");
    });
  });
});
