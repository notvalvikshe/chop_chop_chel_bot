import type { Context, Scenes } from "telegraf";
import type { Service, Staff } from "../../../yclients/yclients.types";
import type { User } from "../../user/user";

// Данные для сцены бронирования
export interface BookingSceneState {
  serviceId?: number;
  staffId?: number;
  selectedDate?: string;
  datetime?: string;
  phone?: string;
  email?: string;
  awaitingPhone?: boolean;
  awaitingEmail?: boolean;
  services?: Service[];
  staff?: Staff[];
}

interface MySceneSession extends Scenes.SceneSessionData {
  booking: BookingSceneState;
  services?: Service[];
  staff?: Staff[];
}

export interface MyContext extends Context {
  user: User;
  session: Scenes.SceneSession<MySceneSession>;
  scene: Scenes.SceneContextScene<MyContext, MySceneSession>;
}
