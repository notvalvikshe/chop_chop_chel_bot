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
import { BookingRepository } from "./booking.repository";

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
    private readonly bookingRepository: BookingRepository,
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

    // Создаем запись в YClients
    const appointment = await this.yclientsApi.createRecord(request, userToken);

    this.logger.debug(`YClients API response: ${JSON.stringify(appointment)}`);

    if (!appointment?.id) {
      this.logger.error(
        `YClients returned appointment without ID: ${JSON.stringify(appointment)}`,
      );
      throw new Error("Failed to create booking: no record ID returned");
    }

    // Получаем информацию о услуге и мастере для сохранения в БД
    const services = await this.getAvailableServices();
    const service = services.find((s) => s.id === serviceId);

    let staffName: string | undefined;
    if (staffId) {
      const staff = await this.yclientsApi.listStaff(this.companyId, [
        serviceId,
      ]);
      const selectedStaff = staff.find((s) => s.id === staffId);
      staffName = selectedStaff?.name;
    }

    // Сохраняем в локальную БД
    await this.bookingRepository.create({
      userId: user.id,
      yclientsRecordId: appointment.id,
      serviceId,
      serviceName: service?.title || "Услуга",
      staffId,
      staffName,
      datetime: new Date(datetime),
    });

    this.logger.log(
      `Booking created: user=${user.id}, record=${appointment.id}, service=${serviceId}`,
    );

    return appointment;
  }

  /**
   * Получить все записи пользователя из локальной БД
   */
  async getUserBookings(userId: number): Promise<Appointment[]> {
    const bookings = await this.bookingRepository.getActiveBookings(userId);

    // Преобразуем записи из БД в формат Appointment для совместимости
    return bookings.map((booking) => ({
      id: booking.yclientsRecordId,
      company_id: this.companyId,
      staff_id: booking.staffId || 0,
      services: [
        {
          id: booking.serviceId,
          title: booking.serviceName,
          cost: 0,
        },
      ],
      datetime: booking.datetime.toISOString(),
      client: {
        id: userId,
        name: "",
        phone: "",
      },
      create_date: booking.createdAt.toISOString(),
      comment: "",
      online: true,
      attendance: 0,
      confirmed: 1,
      seance_length: 0,
      length: 0,
      sms_before: 0,
      sms_now: 0,
      sms_now_text: "",
      email_now: 0,
      notified: 0,
      master_request: 0,
      api_id: "",
      from_url: "",
      record_labels: "",
      activity_id: 0,
    }));
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
