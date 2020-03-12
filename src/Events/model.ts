import { GamePublicState } from "../Game/model"
import { Move } from "../Moves/model"
import { PlayerPublicState } from "../Players/model"

export const AllPlayers = undefined
export type PlayerEventTarget = string | typeof AllPlayers

export enum PlayerEventType {
  GameStarted = "GameStarted",
  GameEnded = "GameEnded",
  Play = "Play",
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

export interface PlayerEventPlay extends PlayerEventBase {
  type: PlayerEventType.Play
}

export type PlayerEvent =
  | PlayerEventGameStarted
  | PlayerEventGameEnded
  | PlayerEventPlay
