import { Logger } from '@nestjs/common';
import { MyContext } from '../app/bot/helpers/bot-types';
import { Message } from 'typegram';

export class LoggerMiddleware {
	private logger = new Logger('MessageLogger');

	middleware() {
		return async (ctx: MyContext, next: () => Promise<void>) => {
			const { name, id } = ctx.user;
			const userInfo = `👤 ${name} (${id})`;

			if (ctx.message) {
				const messageInfo = this.getMessageInfo(ctx.message);
				this.logger.debug(`Received ${messageInfo.type} from ${userInfo}: ${messageInfo.content}`);
			} else if (ctx.updateType === 'callback_query' && ctx.callbackQuery) {
				const data = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : 'empty';
				this.logger.debug(`Received callback query from ${userInfo}: ${data}`);
			} else if (ctx.updateType === 'inline_query') {
				const query = ctx.inlineQuery?.query || 'empty';
				this.logger.debug(`Received inline query from ${userInfo}: ${query}`);
			}

			await next();
		};
	}

	private getMessageInfo(message: Message): { type: string; content: string } {
		if ('text' in message && message.text) {
			return { type: 'text message', content: message.text };
		}

		if ('photo' in message && message.photo) {
			const caption = message.caption || '';
			return { type: 'photo', content: caption ? `with caption: ${caption}` : '[NO CAPTION]' };
		}

		if ('video' in message && message.video) {
			const caption = message.caption || '';
			return { type: 'video', content: caption ? `with caption: ${caption}` : '[NO CAPTION]' };
		}

		if ('voice' in message && message.voice) {
			return { type: 'voice message', content: `duration: ${message.voice.duration}s` };
		}

		if ('audio' in message && message.audio) {
			const title = message.audio.title || '[NO TITLE]';
			return { type: 'audio', content: `title: ${title}, duration: ${message.audio.duration}s` };
		}

		if ('document' in message && message.document) {
			const fileName = message.document.file_name || '[UNNAMED]';
			return { type: 'document', content: `filename: ${fileName}` };
		}

		if ('sticker' in message && message.sticker) {
			const emoji = message.sticker.emoji || '';
			return { type: 'sticker', content: emoji ? `emoji: ${emoji}` : '[NO EMOJI]' };
		}

		if ('location' in message && message.location) {
			const { latitude, longitude } = message.location;
			return { type: 'location', content: `lat: ${latitude}, long: ${longitude}` };
		}

		if ('contact' in message && message.contact) {
			const { first_name, last_name, phone_number } = message.contact;
			const contactName = [first_name, last_name].filter(Boolean).join(' ');
			return { type: 'contact', content: `${contactName}: ${phone_number}` };
		}

		if ('poll' in message && message.poll) {
			return { type: 'poll', content: `question: ${message.poll.question}` };
		}

		if ('animation' in message && message.animation) {
			return { type: 'animation', content: `duration: ${message.animation.duration}s` };
		}

		return { type: 'unknown message type', content: '[CONTENT UNAVAILABLE]' };
	}
}