import * as Cards from "../../src/Cards/domain"
import * as Decks from "../../src/Deck/domain"
import * as Games from "../../src/Game/domain"
import * as Moves from "../../src/Moves/domain"
import * as Players from "../../src/Players/domain"
import { buildGameForSimulation, PlayerTypes, findBestMove } from "../../src/AI/mcts"
import { identity } from "ramda"
import { MoveType } from "../../src/Moves/model"
import { Card } from "../../src/Cards/model"
import { getRight } from "../Game/helpers"

describe("buildGameForSimulation", () => {
  it("should build a game from the current one", () => {
    const deck = Decks.fromCards([{ any: "cards" } as any], 1, 3)
    const discardPile = Cards.fromSymbols("AH 2H")
    const p1 = Players.create("p1", "n1", "t1", Cards.fromSymbols("3H AD"))
    const p2 = Players.create("p2", "n2", "t2", [{ any: "cards" } as any])
    const game = {
      ...Games.create([p1, p2], deck),
      countOfCardsInHand: 2,
      discardPile,
      events: [{ some: " event" } as any],
    }

    const newGame = buildGameForSimulation(identity)(game, p1)
    const newP2 = Players.create("p2", "n2", "t2", Cards.fromSymbols("AC 2C"))

    expect(newGame).toEqual({
      ...game,
      deck: Decks.fromCards(Cards.fromSymbols("3C 2D 3D AS 2S 3S"), 1, 3),
      players: [p1, newP2],
      events: [],
    })
  })
})

describe("findBestMove", () => {
  describe("should", () => {
    const fullDeck = Decks.create()
    const deck = Decks.fromCards(Cards.fromSymbols("2C 5C 8C"), fullDeck.minFaceValue, fullDeck.maxFaceValue)
    const p1 = Players.create("p1", "n1", "t1", Cards.fromSymbols("2H 3H 4H 5H 6H 7H 8H 9H 5D JD"))
    const p2 = Players.create("p2", "n2", "t2", Cards.fromSymbols("2D 4D 6D 8D JD 3S 5S 7S 9S QS"))

    const buildGame = (topCard: Card) => {
      const discardPile = [
        topCard,
        ...fullDeck.cards.filter(Cards.notIn([...deck.cards, ...p1.hand, ...p2.hand, topCard])),
      ]
      return {
        ...Games.create([p1, p2], deck),
        moveCounter: 10,
        discardPile,
      }
    }

    it("should draw if pile card just increases deadwood", () => {
      const game = buildGame(Cards.fromSymbol("KS"))
      const bestMove = findBestMove(game, game.players[0])

      expect(bestMove).toEqual(Moves.create(MoveType.DrawCard))
    })

    it("should pick if pile card decreases deadwood", () => {
      const game = buildGame(Cards.fromSymbol("10H"))
      const bestMove = findBestMove(game, game.players[0])

      expect(bestMove).toEqual(Moves.create(MoveType.PickCard))
    })

    it("discard the card with highest value", () => {
      const pickMove = Moves.create(MoveType.PickCard)
      const game = getRight(Games.run()(buildGame(Cards.fromSymbol("10H")))(Games.play(p1.id, pickMove)))
      const bestMove = findBestMove(game, game.players[0])

      expect(bestMove).toEqual(Moves.createDiscardCardMove(Cards.fromSymbol("JD")))
    })
  })
})
