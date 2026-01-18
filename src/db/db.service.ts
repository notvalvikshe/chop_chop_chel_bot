import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'dotenv/config';
import { drizzle, NodePgClient, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Env } from '../env.validator';
import { Logger as DBLogger } from 'drizzle-orm/logger';
import { highlight } from 'sql-highlight';
class MyLogger implements DBLogger {
	constructor(private logger: Logger) {}
	logQuery(query: string, params: unknown[]): void {
		if (params && params.length === 0) {
			this.logger.debug(`\nQuery: ${highlight(query)}\n`);
			return;
		}

		let inlineQuery = query;
		params.forEach((param, index) => {
			const placeholder = `\\$${index + 1}\\b`;
			const regex = new RegExp(placeholder, 'g');
			const displayValue = typeof param === 'string' ? `'${param}'` : param === null ? 'NULL' : String(param);
			inlineQuery = inlineQuery.replace(regex, displayValue);
		});
		this.logger.debug(`\nQuery: ${highlight(inlineQuery)}`);
	}
}
@Injectable()
export class DBService implements OnModuleInit {
	private readonly logger = new Logger(DBService.name);

	public db: NodePgDatabase<Record<string, never>> & {
		$client: NodePgClient;
	};
	constructor(private readonly config: ConfigService<Env, true>) {}
	async onModuleInit() {
		this.db = drizzle({ connection: this.config.get<string>('DATABASE_URL'), logger: new MyLogger(this.logger) });
	}
}
