import { Move } from "../Moves/model"
import { Player, PlayerPublicState } from "../Players/model"
import { Card } from "../Cards/model"

export enum GameStage {
  Idle = "Idle",
  Playing = "Playing",
  Ended = "Ended",
}

export enum GameErrorType {
  InvalidPlayer = "InvalidPlayer",
  PlayerNotFound = "PlayerNotFound",
  InvalidMove = "InvalidMove",
}

export type GameError = {
  type: GameErrorType
}

export type GamePublicState = Readonly<{
  currentPlayerIndex: number
  discardPile: Card[]
  playersCount: number,
  stage: GameStage
  moveCounter: number
}>

export type Game = Readonly<GamePublicState & {
  stock: Card[]
  players: readonly Player[]
}>

export type MoveValidator = (gameState: GamePublicState, playerState: PlayerPublicState) => (move: Move) => boolean
