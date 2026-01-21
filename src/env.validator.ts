import { createZodDto } from 'nestjs-zod';
import { ZodError, z } from 'zod';

export function validateSchema<T>(schema: z.ZodType, config: Record<string, unknown>): T {
	try {
		return schema.parse(config);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new Error(createErrorMessage(error));
		}
		throw error;
	}
}

function createErrorMessage(error: z.ZodError<unknown>): string {
	let message = 'Validation errors! \n';
	for (const issue of error.issues) {
		message += `[${issue.code}] ${issue.path.join('.')} ${issue.message}\n`;
	}

	return message;
}

export const envSchema = z.object({
	ENV: z.string().min(1),

	PORT: z.string().min(1).transform(Number).default('3000'),

	DB_PORT: z.string().min(1).transform(Number),
	DB_USERNAME: z.string().min(1),
	DB_PASSWORD: z.string().min(1),
	DB_NAME: z.string().min(1),
	DATABASE_URL: z.string().min(1),

	TELEGRAM_TOKEN: z.string().min(1),

	// YClients API configuration
	YCLIENTS_PARTNER_TOKEN: z.string().min(1),
	YCLIENTS_USER_TOKEN: z.string().min(1),
	YCLIENTS_PARTNER_ID: z.string().min(1).transform(Number),
	YCLIENTS_BOOK_FORM_ID: z.string().min(1).transform(Number),
	YCLIENTS_COMPANY_ID: z.string().min(1).transform(Number),
});

export class Env extends createZodDto(envSchema) {}
