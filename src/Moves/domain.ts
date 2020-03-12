import { Card } from "../Cards/model"
import { DiscardCardMoveStep, MoveStepType, SimpleMoveStep } from "./model"

export const createSimpleMoveStep = (moveStep: MoveStepType) => ({
  moveStep
})

export const createDiscardCardStep = (card: Card): DiscardCardMoveStep => ({
  card,
  moveStep: MoveStepType.DrawCard as MoveStepType.DiscardCard,
})

export const createMove = (...moveSteps: SimpleMoveStep[]) => ({
  moveSteps
})