import { Hand, Card } from "../Cards/model"

export type PlayerId = string

export type Player = {
  id: PlayerId
  type: string,
  name: string
  hand: Hand
  lastPickedCard?: Card
}