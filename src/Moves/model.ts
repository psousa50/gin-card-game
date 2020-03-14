import { Card } from "../Cards/model"

export enum MoveType {
  DrawCard = "DrawCard",
  DiscardCard = "DiscardCard",
  PickCard = "PickCard",
  Pass = "Pass",
  Knock = "Knock",
  Gin = "Gin",
}

export type DrawCardMove = {
  moveType: MoveType.DrawCard
}
export type PickCardMove = {
  moveType: MoveType.PickCard
}
export type PassMove = {
  moveType: MoveType.Pass
}
export type KnockMove = {
  moveType: MoveType.Knock
}
export type GinMove = {
  moveType: MoveType.Gin
}
export type DiscardCardMove = {
  card: Card
  moveType: MoveType.DiscardCard
}

export type Move = DrawCardMove | PickCardMove | PassMove | KnockMove | GinMove | DiscardCardMove

export const allSimpleMoves = [
  MoveType.DrawCard,
  MoveType.PickCard,
  MoveType.Pass,
  MoveType.Knock,
  MoveType.Gin,
]

/*
MoveStages

  stage1: [pass] knock gin bigGin draw* pick*
  stage2: discard knock gin bigGin

*/
