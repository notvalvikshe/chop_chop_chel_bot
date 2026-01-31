import { Module, forwardRef } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
	imports: [forwardRef(() => BookingModule)],
	providers: [UserService, UserRepository],
	exports: [UserService, UserRepository],
})
export class UserModule {}
