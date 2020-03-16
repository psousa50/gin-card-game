import { GameAction } from "../utils/actions"

export interface Config {
  auto: boolean
}

export enum NotificationType {
  Started = "Started",
  Played = "Played",
}

export type Notifier = (type: NotificationType, data?: {}) => GameAction

export type Environment = {
  config: Config
  notify: Notifier
}
