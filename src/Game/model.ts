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
  deck: Deck
  deckInfo: DeckInfo
  discardPile: Card[]
  events: PlayerEvent[]
  lastMove: Move | undefined
  moveCounter: number
  playerPassed: boolean
  players: Player[]
  playersCount: number
  stage: GameStage
}

export type MoveValidator = (game: Game, player: Player) => (move: Move) => boolean
