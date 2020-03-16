import * as R from "ramda"
import { Card, FaceValue, faceValueSymbols, Suit, suitOrder, suitSymbols } from "./model"

export const create = (suit: Suit, faceValue: FaceValue) => ({
  faceValue,
  suit,
})

export const equal = (card1: Card) => (card2: Card) => card1.suit === card2.suit && card1.faceValue === card2.faceValue
export const notEqual = (card1: Card) => (card2: Card) => !equal(card1)(card2)

export const isSuit = (suit: Suit) => (card: Card) => card.suit === suit

export const notIn = (cards: Card[]) => (card: Card) => !cards.some(equal(card))

export const orderBySuit = (card1: Card, card2: Card) =>
  card1.suit === card2.suit ? card1.faceValue - card2.faceValue : suitOrder[card1.suit] - suitOrder[card2.suit]

export const orderByFaceValue = (card1: Card, card2: Card) =>
  card1.faceValue === card2.faceValue ?  suitOrder[card1.suit] - suitOrder[card2.suit] : card1.faceValue - card2.faceValue

export const toSymbol = (card: Card) => `${faceValueSymbols[card.faceValue]}${suitSymbols[card.suit]}`

export const fromSymbol = (symbol: string) => {
  const l = symbol.length
  const suitSymbol = symbol.substr(l - 1, 1)
  const suit = R.keys(suitSymbols)[R.values(suitSymbols).findIndex(s => s === suitSymbol)]
  const faceValue = faceValueSymbols.findIndex(s => s === symbol.substring(0, l - 1))

  return create(suit, faceValue)
}

export const toSymbols = (cards: Card[]) => cards.map(toSymbol).join(" ")

export const fromSymbols = (list: string): Card[] => (list.length === 0 ? [] : list.split(" ").map(fromSymbol))

export const cardValue = (card: Card) => Math.min(card.faceValue, 10)

export const calcCardsValue = (cards: Card[]) => cards.reduce((total, card) => total + cardValue(card), 0)