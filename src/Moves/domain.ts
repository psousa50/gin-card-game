import { Card } from "../Cards/model"
import { MoveType, DiscardCardMove, Move } from "./model"

export const createDiscardCardMove = (card: Card): DiscardCardMove => ({
  card,
  moveType: MoveType.DiscardCard as MoveType.DiscardCard,
})

export const create = (moveType: MoveType) => ({
  moveType
}) as Move
