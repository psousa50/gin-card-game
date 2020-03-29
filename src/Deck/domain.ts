import * as R from "ramda"
import * as Cards from "../Cards/domain"
import * as Players from "../Players/domain"
import { rnd } from "../utils/misc"
import { Deck, DeckInfo } from "./model"
import * as CardsModel from "../Cards/model"
import { Player } from "../Players/model"

export const create = (
  minFaceValue: number = CardsModel.minFaceValue,
  maxFaceValue: number = CardsModel.maxFaceValue,
): Deck => {
  const cards = R.flatten(
    CardsModel.suits.map(suit => R.range(minFaceValue, maxFaceValue + 1).map(fv => Cards.create(suit, fv))),
  )
  return {
    cards,
    maxFaceValue,
    minFaceValue,
  }
}

export const defaultDeck = create()

export const info = (deck: Deck): DeckInfo => R.omit(["cards"], deck)

export const fromCards = (
  cards: CardsModel.Card[],
  minFaceValue: number = CardsModel.minFaceValue,
  maxFaceValue: number = CardsModel.maxFaceValue,
): Deck => ({
  cards,
  maxFaceValue,
  minFaceValue,
})

export const shuffle = (deck: Deck, times: number = 100) =>
  R.range(1, times + 1).reduce(({ cards }, _) => {
    const p = rnd(cards.length)
    return { ...deck, cards: [...cards.slice(0, p), ...cards.slice(p + 1), cards[p]] }
  }, deck)

export const drawCards = (cards: CardsModel.Card[], count: number) => ({
  drawn: cards.slice(0, count),
  remaining: cards.slice(count),
})

export const drawDeckCards = (deck: Deck, count: number) => ({
  cards: sortCards(deck.cards.slice(0, count)),
  deck: {
    ...deck,
    cards: deck.cards.slice(count),
  },
})

export const sortCards = (cards: CardsModel.Card[]) => R.sort(Cards.orderBySuit, cards)

export const distributeCards = (cards: CardsModel.Card[], players: Player[], count: number = 10) =>
  players.reduce(
    (acc, player) => {
      const drawnCards = drawCards(cards, count)
      return {
        cards: drawnCards.remaining,
        players: [...acc.players, Players.addCards(player, drawnCards.drawn)],
      }
    },
    { cards, players: [] as Player[] },
  )
