import { Module } from "@nestjs/common";
import { BookingRepository } from "./booking.repository";
import { BookingService } from "./booking.service";

@Module({
  providers: [BookingService, BookingRepository],
  exports: [BookingService],
})
export class BookingModule {}
