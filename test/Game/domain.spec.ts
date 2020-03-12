import * as Cards from "../../src/Cards/domain"
import * as Players from "../../src/Players/domain"
import * as Game from "../../src/Game/domain"
import * as Decks from "../../src/Deck/domain"
import { GameStage, GameErrorType } from "../../src/Game/model"
import { getRight, getLeft } from "./helpers"
import { AllPlayers, PlayerEventType } from "../../src/Events/model"
import { isLeft } from "fp-ts/lib/Either"
import { createMove, createSimpleMoveStep } from "../../src/Moves/domain"
import { MoveStepType } from "../../src/Moves/model"

describe("game", () => {
  const deck = Decks.create()
  const firstDeckCard = deck.cards[0]
  const secondDeckCard = deck.cards[1]
  const p1 = Players.create("p1", "Player 1")
  const p2 = Players.create("p2", "Player 2")
  const players = [p1, p2]

  const newGame = () => Game.create(players, deck)

  describe("On Start", () => {
    it("should init a game", () => {
      const game = Game.create(players, deck)

      expect(game.currentPlayerIndex).toBe(0)
      expect(game.discardPile).toEqual([])
      expect(game.moveCounter).toBe(0)
      expect(game.players).toBe(players)
      expect(game.playersCount).toBe(2)
      expect(game.stage).toBe(GameStage.Idle)
      expect(game.stock).toBe(deck)
      expect(game.events).toEqual([])
    })

    it("should send a GameStarted event to all players", () => {
      const game = getRight(Game.run()(newGame())(Game.start))

      const event = game.events.filter(e => e.type === PlayerEventType.GameStarted)[0]

      expect(event.target).toBe(AllPlayers)
    })

    it("should send a card to the discard pile", () => {
      const game = getRight(Game.run()(newGame())(Game.start))

      expect(game.discardPile).toEqual([firstDeckCard])
      expect(Cards.equals(game.stock.cards[0])(firstDeckCard)).toBeFalsy()
    })

    it("should send a Play event to first player", () => {
      const game = getRight(Game.run()(newGame())(Game.start))

      const event = game.events.filter(e => e.type === PlayerEventType.Play)[0]

      expect(event.target).toBe(p1.id)
    })
  })

  describe("While playing", () => {
    it("should move to next player", () => {
      const move = { some: "move" } as any
      const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))

      expect(game.currentPlayerIndex).toBe(1)
    })

    it("should return an error if wrong player tries to play", () => {
      const move = { some: "move" } as any
      // const move = createMove(createSimpleMoveStep(MoveStepType.Pass))
      const gameError = getLeft(Game.run()(newGame())(Game.start, Game.play(p2.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidPlayer)
    })

    it("should draw a new card on Pass", () => {
      const move = createMove(createSimpleMoveStep(MoveStepType.Pass))
      const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))

      expect(game.discardPile).toEqual([firstDeckCard, secondDeckCard])
    })
  })
})
