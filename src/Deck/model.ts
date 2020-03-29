import { Card } from "../Cards/model"

export type DeckInfo = {
  minFaceValue: number,
  maxFaceValue: number
}

export type Deck = {
  cards: Card[],
} & DeckInfo

