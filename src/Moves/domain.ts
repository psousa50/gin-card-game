import { Card } from "../Cards/model"
import { DiscardCardMoveStep, MoveStepType } from "./model"

export const createDiscardCardStep = (card: Card): DiscardCardMoveStep => ({
  card,
  moveStep: MoveStepType.DrawCard as MoveStepType.DiscardCard,
})
