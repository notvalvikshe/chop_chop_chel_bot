import { Context, Scenes } from 'telegraf';
import { User } from '../../user/user';

interface MySceneSession extends Scenes.SceneSessionData { }
interface MySession extends Scenes.SceneSession<MySceneSession> { }

export interface MyContext extends Context {
	user: User;
	session: MySession;
}
