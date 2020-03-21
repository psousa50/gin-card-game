import { Move } from "../Moves/model"
import { Player, PlayerPublicState } from "../Players/model"
import { Card } from "../Cards/model"
import { Deck, DeckInfo } from "../Deck/model"
import { PlayerEvent } from "../Events/model"

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

export type GamePublicState = {
  countOfCardsInHand: number
  currentPlayerIndex: number
  deckInfo: DeckInfo
  discardPile: Card[]
  playersCount: number,
  stage: GameStage
  moveCounter: number
}

export type Game = GamePublicState & {
  deck: Deck
  players: Player[]
  events: PlayerEvent[]
}

export type MoveValidator = (gameState: GamePublicState, playerState: PlayerPublicState) => (move: Move) => boolean
