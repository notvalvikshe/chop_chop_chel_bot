export class BotError extends Error {
	constructor(message: string, public type: 'System' | 'User') {
		super(message);
	}
}
