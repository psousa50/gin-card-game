import { Move } from "../Moves/model"
import { Player } from "../Players/model"
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

export type Game = {
  countOfCardsInHand: number
  currentPlayerIndex: number
  deckInfo: DeckInfo
  discardPile: Card[]
  playersCount: number
  playerPassed: boolean
  stage: GameStage
  moveCounter: number
  deck: Deck
  players: Player[]
  events: PlayerEvent[]
}

export type MoveValidator = (game: Game, player: Player) => (move: Move) => boolean
