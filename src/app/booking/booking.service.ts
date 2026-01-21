import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Env } from "../../env.validator";
import { YClientsApiService } from "../../yclients/yclients-api.service";
import type {
  Appointment,
  CreateRecordRequest,
  Service,
  Staff,
  TimeSlot,
} from "../../yclients/yclients.types";
import type { User } from "../user/user";

/**
 * Сервис для работы с бронированием через YClients API
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly companyId: number;

  constructor(
    private readonly yclientsApi: YClientsApiService,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.companyId = this.config.get("YCLIENTS_COMPANY_ID");
  }

  /**
   * Получить список всех услуг с ценами (только доступные для онлайн-записи)
   */
  async getAvailableServices(): Promise<Service[]> {
    const allServices = await this.yclientsApi.listServices(this.companyId);
    this.logger.debug(`Total services from API: ${allServices.length}`);
    this.logger.debug(
      `Services data: ${JSON.stringify(allServices.map((s) => ({ id: s.id, title: s.title, is_online: s.is_online })))}`,
    );
    return allServices.filter((service) => service.is_online);
  }

  /**
   * Получить список услуг по категории
   */
  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    const allServices = await this.yclientsApi.listServices(
      this.companyId,
      categoryId,
    );
    return allServices.filter((service) => service.is_online);
  }

  /**
   * Получить список мастеров, которые могут выполнить выбранную услугу
   */
  async getStaffForService(serviceId: number): Promise<Staff[]> {
    const allStaff = await this.yclientsApi.listStaff(this.companyId, [
      serviceId,
    ]);
    // Фильтруем мастеров: не уволены (fired=0) и не скрыты (hidden=0)
    return allStaff.filter((staff) => !staff.fired && !staff.hidden);
  }

  /**
   * Получить доступные слоты для записи
   */
  async getAvailableSlots(
    serviceId: number,
    staffId: number | undefined,
    date: string,
  ): Promise<TimeSlot[]> {
    if (!staffId) {
      return [];
    }

    return this.yclientsApi.getFreeTimes(staffId, date, [serviceId]);
  }

  /**
   * Создать запись на услугу
   */
  async createBooking(
    serviceId: number,
    staffId: number | undefined,
    datetime: string,
    user: User,
    userToken?: string,
  ): Promise<Appointment> {
    const request: CreateRecordRequest = {
      phone: user.yclientsPhone || "79000000000",
      fullname: `${user.firstName} ${user.secondName || ""}`.trim(),
      email: user.yclientsEmail || "user@example.com",
      appointments: [
        {
          id: 0, // 0 для новой записи
          staff_id: staffId || 0, // 0 означает "любой мастер"
          services: [serviceId],
          datetime,
        },
      ],
    };

    return this.yclientsApi.createRecord(request, userToken);
  }

  /**
   * Получить все записи пользователя
   */
  async getUserBookings(
    userToken: string,
    from?: string,
    to?: string,
  ): Promise<Appointment[]> {
    return this.yclientsApi.getUserRecords(
      {
        company_id: this.companyId,
        from,
        to,
      },
      userToken,
    );
  }

  /**
   * Отменить запись
   */
  async cancelBooking(recordId: number, userToken: string): Promise<void> {
    return this.yclientsApi.cancelRecord(recordId, userToken);
  }

  /**
   * Перенести запись
   */
  async rescheduleBooking(
    recordId: number,
    newDatetime: string,
    userToken: string,
  ): Promise<Appointment> {
    return this.yclientsApi.rescheduleRecord(recordId, newDatetime, userToken);
  }
}
