import { Card } from "../Cards/model"
import { MoveType, DiscardCardMove } from "./model"

export const createDiscardCardMove = (card: Card): DiscardCardMove => ({
  card,
  moveType: MoveType.DiscardCard as MoveType.DiscardCard,
})

export const createMove = (moveType: MoveType) => ({
  moveType
})