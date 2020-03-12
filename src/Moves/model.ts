import { Card } from "../Cards/model"

export enum MoveStepType {
  DrawCard = "DrawCard",
  DiscardCard = "DiscardCard",
  PickCard = "PickCard",
  Pass = "Pass",
  Knock = "Knock",
  Gin = "Gin",
  BigGin = "BigGin",
}

export type SimpleMoveStep = {
  moveStep: MoveStepType
}

export type DiscardCardMoveStep = {
  card: Card
  moveStep: MoveStepType.DiscardCard
}

export type MoveStep = SimpleMoveStep | DiscardCardMoveStep

export type Move = {
  moveSteps: MoveStep[]
}

