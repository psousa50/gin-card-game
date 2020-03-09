import { fromList, toList } from "../../src/Cards/domain"
import { findAllPossibleMelds, findMinimalDeadwood, permutations } from "../../src/Game/melds"
import { Card } from "../../src/Cards/model"
import { flatten } from "ramda"

describe("extractMelds", () => {
  describe("with no restrictions", () => {
    it("should group Sets of 3", () => {
      const cards = fromList("2C 3S 3H 3D")
      const expected = {
        deadwood: fromList("2C"),
        runs: [],
        sets: [fromList("3S 3H 3D")],
      }

      expect(findAllPossibleMelds(cards)).toEqual(expected)
    })

    it("should group Sets of 4", () => {
      const cards = fromList("2C 3S 3H 3D 3C")
      const expected = {
        deadwood: fromList("2C"),
        runs: [],
        sets: [fromList("3S 3H 3D 3C")],
      }

      expect(findAllPossibleMelds(cards)).toEqual(expected)
    })

    it("shouldn't group Sets of 2", () => {
      const cards = fromList("2C 3S 3H")
      const expected = {
        deadwood: fromList("2C 3S 3H"),
        runs: [],
        sets: [],
      }

      expect(findAllPossibleMelds(cards)).toEqual(expected)
    })

    it("should group Runs of 3", () => {
      const cards = fromList("2C 4S 5S 6S 9D 10D JD")
      const expected = {
        deadwood: fromList("2C"),
        runs: [fromList("9D 10D JD"), fromList("4S 5S 6S")],
        sets: [],
      }

      expect(findAllPossibleMelds(cards)).toEqual(expected)
    })

    it("should use the same card for Runs and Sets", () => {
      const cards = fromList("2C 4S 5S 6S 6D 6C")
      const expected = {
        deadwood: fromList("2C"),
        runs: [fromList("4S 5S 6S")],
        sets: [fromList("6S 6D 6C")],
      }

      expect(findAllPossibleMelds(cards)).toEqual(expected)
    })
  })
  describe("with restrictions", () => {
    it("shouldn't group a card in a Set if it should be on Run", () => {
      const cards = fromList("2C 6S 6D 6C")
      const cardsOnRuns = fromList("6S")
      const expected = undefined

      expect(findAllPossibleMelds(cards, cardsOnRuns)).toEqual(expected)
    })

    it("shouldn't group a card in a Run if it should be on Set", () => {
      const cards = fromList("2C 4S 5S 6S")
      const cardsOnSets = fromList("6S")
      const expected = undefined

      expect(findAllPossibleMelds(cards, [], cardsOnSets)).toEqual(expected)
    })

    it("should assign cards to the correct Melds", () => {
      const cards = fromList("2C 3S 4S 5S 6S 6D 6C 6H 3D 3H")
      const cardsOnRuns = fromList("6S")
      const cardsOnSets = fromList("3S")
      const expected = {
        deadwood: fromList("2C"),
        runs: [fromList("4S 5S 6S")],
        sets: [fromList("3S 3D 3H"), fromList("6D 6C 6H")],
      }

      expect(findAllPossibleMelds(cards, cardsOnRuns, cardsOnSets)).toEqual(expected)
    })
  })
})

describe("findMinimalDeadwood", () => {
  it("should return empty meld if no cards given", () => {
    const cards = [] as Card[]
    const expected = {
      deadwood: [],
      deadwoodValue: 0,
      runs: [],
      sets: [],
    }

    expect(findMinimalDeadwood(cards)).toEqual(expected)
  })

  it("should group Sets of 3", () => {
    const cards = fromList("2C 3S 3H 3D")
    const expected = {
      deadwood: fromList("2C"),
      deadwoodValue: 2,
      runs: [],
      sets: [fromList("3S 3H 3D")],
    }

    expect(findMinimalDeadwood(cards)).toEqual(expected)
  })

  describe("should choose the best configuration when a card can be on a Run and on Set", () => {
    it("Case 1", () => {
      const cards = fromList("2C 3S 4S 5S 5D 5H")
      const expected = {
        deadwood: fromList("2C 3S 4S"),
        deadwoodValue: 9,
        runs: [],
        sets: [fromList("5S 5D 5H")],
      }

      expect(findMinimalDeadwood(cards)).toEqual(expected)
    })

    it("case 2", () => {
      const cards = fromList("2C 3C 3S 4S 5S 5D 5H 4H 7H 8H JS QS AD AS AC AH")
      const expected = {
        deadwood: fromList("3S 4S 4H 7H 8H JS QS"),
        deadwoodValue: 46,
        runs: [fromList("AC 2C 3C")],
        sets: [fromList("AD AS AH"), fromList("5S 5D 5H")],
      }

      expect(findMinimalDeadwood(cards)).toEqual(expected)
    })

    it("case 3", () => {
      const cards = fromList("10H 3S 2D 4D 6D 8D JD 8C 9C 10C")
      const expected = {
        deadwood: fromList("10H 3S 2D 4D 6D 8D JD"),
        deadwoodValue: 43,
        runs: [fromList("8C 9C 10C")],
        sets: [],
      }

      expect(findMinimalDeadwood(cards)).toEqual(expected)
    })

    it("case 4", () => {
      const cards = fromList("2S 3S 4S 5S 8C 9C 10C 2D 4D 6D")
      const expected = {
        deadwood: fromList("2D 4D 6D"),
        deadwoodValue: 12,
        runs: [fromList("8C 9C 10C"), fromList("2S 3S 4S 5S")],
        sets: [],
      }

      expect(findMinimalDeadwood(cards)).toEqual(expected)
    })
  })
})
