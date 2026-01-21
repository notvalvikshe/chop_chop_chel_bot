import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte } from 'drizzle-orm';
import { DBService } from '../../db/db.service';
import { bookingSchema } from '../../db/schema';

export interface CreateBookingData {
	userId: number;
	yclientsRecordId: number;
	companyId: number;
	companyName: string;
	serviceId: number;
	serviceName: string;
	staffId?: number;
	staffName?: string;
	datetime: Date;
}

export interface Booking {
	id: number;
	userId: number;
	yclientsRecordId: number;
	companyId: number;
	companyName: string;
	serviceId: number;
	serviceName: string;
	staffId: number | null;
	staffName: string | null;
	datetime: Date;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

@Injectable()
export class BookingRepository {
	constructor(private readonly db: DBService) {}

	/**
	 * Создать запись о бронировании
	 */
	async create(data: CreateBookingData): Promise<Booking> {
		const [booking] = await this.db.db
			.insert(bookingSchema)
			.values({
				userId: data.userId,
				yclientsRecordId: data.yclientsRecordId,
				companyId: data.companyId,
				companyName: data.companyName,
				serviceId: data.serviceId,
				serviceName: data.serviceName,
				staffId: data.staffId || null,
				staffName: data.staffName || null,
				datetime: data.datetime,
				status: 'active',
			})
			.returning();

		return booking as Booking;
	}

	/**
	 * Получить активные записи пользователя (будущие)
	 */
	async getActiveBookings(userId: number): Promise<Booking[]> {
		const now = new Date();

		const bookings = await this.db.db
			.select()
			.from(bookingSchema)
			.where(and(eq(bookingSchema.userId, userId), eq(bookingSchema.status, 'active'), gte(bookingSchema.datetime, now)))
			.orderBy(desc(bookingSchema.datetime));

		return bookings as Booking[];
	}

	/**
	 * Получить все записи пользователя (включая прошлые)
	 */
	async getAllBookings(userId: number): Promise<Booking[]> {
		const bookings = await this.db.db
			.select()
			.from(bookingSchema)
			.where(eq(bookingSchema.userId, userId))
			.orderBy(desc(bookingSchema.datetime));

		return bookings as Booking[];
	}

	/**
	 * Найти запись по ID записи в YClients
	 */
	async findByYclientsRecordId(yclientsRecordId: number): Promise<Booking | null> {
		const [booking] = await this.db.db.select().from(bookingSchema).where(eq(bookingSchema.yclientsRecordId, yclientsRecordId)).limit(1);

		return (booking as Booking) || null;
	}

	/**
	 * Обновить статус записи
	 */
	async updateStatus(id: number, status: 'active' | 'cancelled' | 'completed'): Promise<Booking | null> {
		const [booking] = await this.db.db
			.update(bookingSchema)
			.set({ status, updatedAt: new Date() })
			.where(eq(bookingSchema.id, id))
			.returning();

		return (booking as Booking) || null;
	}

	/**
	 * Отменить запись
	 */
	async cancel(id: number): Promise<Booking | null> {
		return this.updateStatus(id, 'cancelled');
	}
}
