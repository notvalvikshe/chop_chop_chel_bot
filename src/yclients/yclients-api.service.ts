import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { Env } from "../env.validator";
import type {
  Appointment,
  AuthConfirmResponse,
  AuthStartResponse,
  BookFormConfig,
  Company,
  CreateRecordRequest,
  GetFreeTimesParams,
  GetUserRecordsParams,
  Service,
  ServiceCategory,
  Staff,
  TimeSlot,
  YClientsApiResponse,
} from "./yclients.types";

/**
 * Сервис для работы с YClients API
 * Реализует эндпоинты согласно docs/apidoc.md
 */
@Injectable()
export class YClientsApiService {
  private readonly logger = new Logger(YClientsApiService.name);
  private readonly httpClient: AxiosInstance;
  private readonly partnerToken: string;
  private readonly userToken: string;
  private readonly baseUrl = "https://api.yclients.com";

  private readonly companyId: number;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.partnerToken = this.config.get("YCLIENTS_PARTNER_TOKEN");
    this.userToken = this.config.get("YCLIENTS_USER_TOKEN");
    this.companyId = this.config.get("YCLIENTS_COMPANY_ID");

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Accept: "application/vnd.yclients.v2+json",
        "Content-Type": "application/json",
      },
      params: {
        partner_id: this.companyId,
      },
    });

    // Interceptor для логирования запросов
    this.httpClient.interceptors.request.use((config) => {
      this.logger.debug(`→ ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Interceptor для логирования ответов и ошибок
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`← ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error(
          `✗ ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${error.response?.status || "Network Error"}`,
          error.response?.data,
        );
        throw error;
      },
    );
  }

  /**
   * Формирует заголовок Authorization с партнёрским и/или пользовательским токеном
   */
  private getAuthHeader(userToken?: string): string {
    if (userToken) {
      return `Bearer ${this.partnerToken}, User ${userToken}`;
    }
    return `Bearer ${this.partnerToken}`;
  }

  // ========== AUTH ==========

  /**
   * Отправить SMS-код для аутентификации пользователя
   */
  async startAuth(phone: string): Promise<AuthStartResponse> {
    const response = await this.httpClient.post<
      YClientsApiResponse<AuthStartResponse>
    >(
      "/api/v1/auth",
      { login: phone },
      {
        headers: { Authorization: this.getAuthHeader() },
      },
    );
    return response.data.data;
  }

  /**
   * Подтвердить SMS-код и получить user_token
   */
  async confirmAuth(
    phone: string,
    code: string,
    uuid: string,
  ): Promise<AuthConfirmResponse> {
    const response = await this.httpClient.post<
      YClientsApiResponse<AuthConfirmResponse>
    >(
      "/api/v1/auth",
      { login: phone, code, uuid },
      {
        headers: { Authorization: this.getAuthHeader() },
      },
    );
    return response.data.data;
  }

  // ========== BOOKFORM ==========

  /**
   * Получить конфигурацию формы бронирования
   */
  async getBookFormConfig(bookFormId: number): Promise<BookFormConfig> {
    const response = await this.httpClient.get<
      YClientsApiResponse<BookFormConfig>
    >(`/api/v1/bookform/${bookFormId}`, {
      headers: { Authorization: this.getAuthHeader(this.userToken) },
    });
    return response.data.data;
  }

  // ========== COMPANIES ==========

  /**
   * Получить информацию о компании
   */
  async getCompany(companyId: number): Promise<Company> {
    const response = await this.httpClient.get<YClientsApiResponse<Company>>(
      `/api/v1/companies/${companyId}`,
      {
        headers: { Authorization: this.getAuthHeader() },
      },
    );
    return response.data.data;
  }

  // ========== SERVICES ==========

  /**
   * Получить категории услуг компании
   */
  async listServiceCategories(companyId: number): Promise<ServiceCategory[]> {
    const response = await this.httpClient.get<
      YClientsApiResponse<ServiceCategory[]>
    >(`/api/v1/company/${companyId}/service_categories`, {
      headers: { Authorization: this.getAuthHeader(this.userToken) },
    });
    return response.data.data;
  }

  /**
   * Получить список услуг компании
   */
  async listServices(
    companyId: number,
    categoryId?: number,
  ): Promise<Service[]> {
    const params: Record<string, unknown> = {};
    if (categoryId !== undefined) {
      params.category_id = categoryId;
    }

    const response = await this.httpClient.get<YClientsApiResponse<Service[]>>(
      `/api/v1/company/${companyId}/services`,
      {
        headers: { Authorization: this.getAuthHeader(this.userToken) },
        params,
      },
    );
    return response.data.data;
  }

  // ========== STAFF ==========

  /**
   * Получить список сотрудников компании
   */
  async listStaff(companyId: number, serviceIds?: number[]): Promise<Staff[]> {
    const params: Record<string, unknown> = {};
    if (serviceIds && serviceIds.length > 0) {
      params.service_ids = serviceIds.join(",");
    }

    const response = await this.httpClient.get<YClientsApiResponse<Staff[]>>(
      `/api/v1/company/${companyId}/staff`,
      {
        headers: { Authorization: this.getAuthHeader(this.userToken) },
        params,
      },
    );
    return response.data.data;
  }

  // ========== FREE TIMES ==========

  /**
   * Получить доступные временные слоты для записи
   * @param staffId - ID мастера
   * @param date - дата в формате YYYY-MM-DD
   * @param serviceIds - массив ID услуг
   */
  async getFreeTimes(
    staffId: number,
    date: string,
    serviceIds: number[],
  ): Promise<TimeSlot[]> {
    const params: Record<string, string> = {};
    serviceIds.forEach((id, index) => {
      params[`service_ids[${index}]`] = String(id);
    });

    const response = await this.httpClient.get<YClientsApiResponse<TimeSlot[]>>(
      `/api/v1/book_times/${this.companyId}/${staffId}/${date}`,
      {
        headers: { Authorization: this.getAuthHeader(this.userToken) },
        params,
      },
    );
    return response.data.data;
  }

  // ========== RECORDS ==========

  /**
   * Создать новую запись (бронирование)
   */
  async createRecord(
    request: CreateRecordRequest,
    userToken?: string,
  ): Promise<Appointment> {
    const response = await this.httpClient.post<
      YClientsApiResponse<Appointment>
    >(`/api/v1/book_record/${this.companyId}`, request, {
      headers: {
        Authorization: this.getAuthHeader(userToken || this.userToken),
      },
    });
    return response.data.data;
  }

  /**
   * Получить записи пользователя
   */
  async getUserRecords(
    params: GetUserRecordsParams,
    userToken?: string,
  ): Promise<Appointment[]> {
    const response = await this.httpClient.get<
      YClientsApiResponse<Appointment[]>
    >("/api/v1/user/records", {
      headers: {
        Authorization: this.getAuthHeader(userToken || this.userToken),
      },
      params,
    });
    return response.data.data;
  }

  /**
   * Отменить запись
   */
  async cancelRecord(recordId: number, userToken?: string): Promise<void> {
    await this.httpClient.delete(`/api/v1/records/${recordId}`, {
      headers: {
        Authorization: this.getAuthHeader(userToken || this.userToken),
      },
    });
  }

  /**
   * Перенести запись на другое время
   */
  async rescheduleRecord(
    recordId: number,
    datetime: string,
    userToken?: string,
  ): Promise<Appointment> {
    const response = await this.httpClient.put<
      YClientsApiResponse<Appointment>
    >(
      `/api/v1/records/${recordId}`,
      { datetime },
      {
        headers: {
          Authorization: this.getAuthHeader(userToken || this.userToken),
        },
      },
    );
    return response.data.data;
  }
}
