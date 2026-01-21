import { Global, Module } from '@nestjs/common';
import { YClientsApiService } from './yclients-api.service';

@Global()
@Module({
	providers: [YClientsApiService],
	exports: [YClientsApiService],
})
export class YClientsModule {}
