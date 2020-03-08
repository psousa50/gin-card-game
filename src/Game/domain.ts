import * as Cards from "../Cards/domain"
import { Card, suits } from "../Cards/model"
import { keys, sort, flatten, binary, range } from "ramda"
import { calcCardsValue } from "../Cards/domain"

type CardCount = {
  [k: string]: Card[]
}

type SuitCards = {
  [k: string]: Card[]
}

type MeldsAndDeadwood = {
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

export const findAllPossibleMelds = (
  cards: Card[],
  cardsToBeOnRuns: Card[] | undefined = undefined,
  cardsOnToBeSets: Card[] | undefined = undefined,
) => {
  const cardsForRuns = cardsOnToBeSets ? cards.filter(Cards.notIn(cardsOnToBeSets)) : cards
  const cardsForSets = cardsToBeOnRuns ? cards.filter(Cards.notIn(cardsToBeOnRuns)) : cards

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

  const cardsOnRuns = flatten(runs)
  const cardsOnSets = flatten(sets)

  if (cardsOnToBeSets && cardsOnToBeSets.some(Cards.notIn(cardsOnSets))) {
    return undefined
  }
  if (cardsToBeOnRuns && cardsToBeOnRuns.some(Cards.notIn(cardsOnRuns))) {
    return undefined
  }

  const deadwood = cards.filter(Cards.notIn([...cardsOnRuns, ...cardsOnSets]))

  return {
    deadwood,
    sets,
    runs,
  } as MeldsAndDeadwood
}

const next = (binary: number[]): number[] =>
  binary.length === 0 ? [1] : binary[0] === 0 ? [1, ...binary.slice(1)] : [0, ...next(binary.slice(1))]

const buildMelds = (cards: Card[], duplicates: Card[], binary: number[]) => {
  const cardsToBeOnRuns = duplicates.filter((_, i) => binary[i] === 0)
  const cardsToBeOnSets = duplicates.filter((_, i) => binary[i] === 1)
  return findAllPossibleMelds(cards, cardsToBeOnRuns, cardsToBeOnSets)
}

export const findMinimalDeadwood = (cards: Card[]) => {
  const { runs, sets } = findAllPossibleMelds(cards)!
  const cardsOnMelds = [...flatten(runs), ...flatten(sets)]
  const duplicates = cardsOnMelds.reduce(
    (acc, card, i) => (i !== cardsOnMelds.findIndex(Cards.equals(card)) ? [...acc, card] : acc),
    [] as Card[],
  )

  const size = duplicates.length
  const binary = new Array<number>(size).fill(0)
  const iterations = Math.pow(2, size)
  const allMelds = range(0, iterations).reduce(
    acc => {
      const melds = buildMelds(cards, duplicates, acc.binary)
      return {
        binary: next(binary),
        melds: melds ? [...acc.melds, melds] : acc.melds,
      }
    },
    { binary, melds: [] as MeldsAndDeadwood[] },
  )

  const bestMeld = allMelds.melds.reduce(
    (acc, meld) => {
      const value = calcCardsValue(meld.deadwood)
      return value < acc.bestValue
        ? {
            bestValue: value,
            bestMeld: meld,
          }
        : acc
    },
    {
      bestValue: Number.MAX_SAFE_INTEGER,
      bestMeld: undefined as MeldsAndDeadwood | undefined,
    },
  )

  return bestMeld.bestMeld
}
