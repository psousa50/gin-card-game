import { GamePublicState } from "../Game/model"
import { Move } from "../Moves/model"
import { PlayerPublicState } from "../Players/model"

export type PlayerEventTarget = string

export enum PlayerEventType {
  GameStarted = "GameStarted",
  GameEnded = "GameEnded",
  PlayStage1 = "PlayStage1",
  PlayStage2 = "PlayStage2",
  DiscardCard = "DiscardCard",
}

export interface PlayerEventBase {
  type: PlayerEventType
  target: PlayerEventTarget
  playerState: PlayerPublicState
  gameState: GamePublicState
}

export interface PlayerEventGameStarted extends PlayerEventBase {
  type: PlayerEventType.GameStarted
}

export interface PlayerEventGameEnded extends PlayerEventBase {
  type: PlayerEventType.GameEnded
}

export interface PlayerEventPlayStage1 extends PlayerEventBase {
  type: PlayerEventType.PlayStage1
}

export interface PlayerEventPlayStage2 extends PlayerEventBase {
  type: PlayerEventType.PlayStage2
}

export interface PlayerEventDiscard extends PlayerEventBase {
  type: PlayerEventType.DiscardCard
}

export type PlayerEvent =
  | PlayerEventGameStarted
  | PlayerEventGameEnded
  | PlayerEventPlayStage1
  | PlayerEventPlayStage2
  | PlayerEventDiscard