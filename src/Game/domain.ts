import * as Cards from "../Cards/domain"
import { Card, suits } from "../Cards/model"
import { keys, sort, flatten } from "ramda"

type CardCount = {
  [k: string]: Card[]
}

type SuitCards = {
  [k: string]: Card[]
}

type CardGroup = {
  deadwood: Card[]
  sets: Card[][]
  runs: Card[][]
}

const sequences = (someSuitCards: Card[]): Card[][] => {
  const ordered = sort(Cards.order, someSuitCards)

  const seqs = ordered.reduce((acc, card) => {
    const l = acc.length
    const last = l > 0 ? acc[l - 1] : undefined
    return !last || card.faceValue === last[last.length - 1].faceValue + 1
      ? [...acc.slice(0, l - 2), [...(last || []), card]]
      : [...acc, [card]]
  }, [] as Card[][])

  return seqs.filter(s => s.length >= 3)
}

export const extractMelds = (
  cards: Card[],
  cardsOnRuns: Card[] | undefined = undefined,
  cardsOnSets: Card[] | undefined = undefined,
) => {
  const cardsForRuns = cardsOnSets ? cards.filter(Cards.notIn(cardsOnSets)) : cards
  const cardsForSets = cardsOnRuns ? cards.filter(Cards.notIn(cardsOnRuns)) : cards

  const cardsHistogram = cardsForSets.reduce(
    (acc, card) => ({ ...acc, [card.faceValue]: [...(acc[card.faceValue] || []), card] }),
    {} as CardCount,
  )
  const sets = keys(cardsHistogram).reduce(
    (acc, k) => (cardsHistogram[k].length < 3 ? acc : [...acc, cardsHistogram[k]]),
    [] as Card[][],
  )

  const cardSuits = suits.reduce(
    (acc, cur) => ({ ...acc, [cur]: cardsForRuns.filter(Cards.isSuit(cur)) }),
    {} as SuitCards,
  )
  const runs = suits.reduce((acc, suit) => [...acc, ...sequences(cardSuits[suit])], [] as Card[][])

  const flattenRuns = flatten(runs)
  const flattenSets = flatten(sets)

  if (cardsOnSets && cardsOnSets.some(Cards.notIn(flattenSets))) {
    return undefined
  }
  if (cardsOnRuns && cardsOnRuns.some(Cards.notIn(flattenRuns))) {
    return undefined
  }

  const deadwood = cards.filter(Cards.notIn([...flattenRuns, ...flattenSets]))

  return {
    deadwood,
    sets,
    runs,
  }
}
