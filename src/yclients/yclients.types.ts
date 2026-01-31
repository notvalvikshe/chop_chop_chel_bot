/**
 * YClients API типы согласно apidoc.md
 */

export interface YClientsApiResponse<T = unknown> {
	success: boolean;
	data: T;
	meta?: { [key: string]: unknown };
}

// Auth
export interface AuthStartResponse {
	flow: string;
	uuid: string;
	message?: string;
}

export interface AuthConfirmResponse {
	user_token: string;
	user: {
		id: number;
		name: string;
		phone: string;
		email?: string;
	};
}

// Company
export interface Company {
	id: number;
	title: string;
	address?: string;
	phone?: string;
	timezone?: string;
}

// Services
export interface ServiceCategory {
	id: number;
	title: string;
	weight?: number;
	api_id?: string;
	booking_title?: string;
	price_min?: number;
	price_max?: number;
}

export interface Service {
	id: number;
	title: string;
	duration: number; // в секундах
	price_min: number;
	price_max: number;
	is_online: boolean;
	category_id?: number;
	comment?: string;
	active: number; // 1 = активна
	weight?: number;
	discount?: number;
	prepaid?: string; // "forbidden" | "allowed" | "required"
}

// Staff
export interface Staff {
	id: number;
	name: string;
	specialization?: string;
	avatar?: string;
	avatar_big?: string;
	fired: number; // 0 = активен, 1 = уволен
	is_fired?: boolean;
	hidden: number; // 0 = виден, 1 = скрыт
	is_online?: boolean;
	is_bookable?: boolean;
	rating?: number;
	information?: string;
}

// Booking
export interface BookingService {
	id: number;
	title?: string;
}

export interface Client {
	id?: number;
	name: string;
	phone: string;
	email?: string;
}

export interface Appointment {
	id: number;
	company_id: number;
	staff_id: number;
	services: BookingService[];
	datetime: string; // ISO 8601
	client: Client;
	comment?: string;
	length?: number;
	create_date?: string;
}

// Расширенный тип Appointment с дополнительными полями для бота
export interface ExtendedAppointment extends Appointment {
	staff_name?: string | null;
	company_name?: string | null;
}

// Тип ответа от YClients API при создании записи
export interface CreateRecordResponse {
	id: number;
	record_id: number;
}

// Requests
export interface CreateRecordRequest {
	phone: string;
	fullname: string;
	email: string;
	appointments: Array<{
		id: number; // 0 для новой записи
		staff_id: number;
		services: number[];
		datetime: string; // ISO 8601
	}>;
	comment?: string;
}

export interface GetUserRecordsParams {
	company_id: number;
	from?: string; // ISO date
	to?: string; // ISO date
}

export interface TimeSlot {
	time: string; // "14:30"
	seance_length: number;
	sum_length: number;
	datetime: string; // "2026-01-21T14:30:00+05:00"
}

export interface GetFreeTimesParams {
	service_ids: number[]; // массив ID услуг как query параметры
}

export interface BookFormConfig {
	group_id: number;
	company_id: number;
	phone_confirmation: boolean;
	steps: Array<{
		step: string;
		title: string;
		num: number;
		hidden: boolean;
	}>;
}
