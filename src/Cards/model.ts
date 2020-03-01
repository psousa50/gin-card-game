export enum Suit {
  Clubs = "Clubs",
  Diamonds = "Diamonds",
  Hearts = "Hearts",
  Spades = "Spades",
}

export const suitOrder = {
  [Suit.Hearts]: 0,
  [Suit.Clubs]: 1,
  [Suit.Diamonds]: 2,
  [Suit.Spades]: 3,
}

export const faceValues = {
  ace: 1,
  jack: 11,
  king: 13,
  queen: 12,
}

export const faceValueSymbols = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

export const suitSymbols = {
  [Suit.Hearts]: "H",
  [Suit.Clubs]: "C",
  [Suit.Diamonds]: "D",
  [Suit.Spades]: "S",
}

export const suits = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades]
export const minFaceValue = 1
export const maxFaceValue = 13

export type FaceValue = number

export type Card = {
  suit: Suit
  faceValue: FaceValue
}

export type Hand = Card[]
