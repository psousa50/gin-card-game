import { Card } from "../Cards/model"

export enum MoveType {
  DrawCard = "DrawCard",
  DiscardCard = "DiscardCard",
  PickCard = "PickCard",
  Pass = "Pass",
  Knock = "Knock",
  Gin = "Gin",
  BigGin = "BigGin",
}

export type SimpleMove = {
  moveType: MoveType
}

export type DiscardCardMove = SimpleMove & {
  card: Card
}

export type Move = SimpleMove | DiscardCardMove

/*
MoveStages

  stage1: [pass] knock gin bigGin draw* pick*
  stage2: discard knock gin bigGin

*/