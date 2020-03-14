import * as Cards from "../../src/Cards/domain"
import * as Players from "../../src/Players/domain"
import * as Game from "../../src/Game/domain"
import * as Decks from "../../src/Deck/domain"
import { GameStage, GameErrorType } from "../../src/Game/model"
import { getRight, getLeft } from "./helpers"
import { PlayerEventType } from "../../src/Events/model"
import { createMove, createDiscardCardMove } from "../../src/Moves/domain"
import { MoveType } from "../../src/Moves/model"
import { randomElement } from "../../src/utils/misc"
import { isRight, isLeft } from "fp-ts/lib/Either"
import { pick } from "ramda"

describe("game", () => {
  const deck = Decks.create()
  const p1 = Players.create("p1", "Player 1")
  const p2 = Players.create("p2", "Player 2")
  const players = [p1, p2]
  const handCount = 10
  const playersCount = 2

  const newGame = () => Game.create(players, deck)

  it("should create a game", () => {
    const game = Game.create(players, deck)

    expect(handCount).toBe(10)
    expect(game.currentPlayerIndex).toBe(0)
    expect(game.discardPile).toEqual([])
    expect(game.moveCounter).toBe(0)
    expect(game.players).toBe(players)
    expect(game.playersCount).toBe(2)
    expect(game.stage).toBe(GameStage.Idle)
    expect(game.deck).toBe(deck)
    expect(game.events).toEqual([])
  })

  describe("On Start", () => {
    it("should distribute cards", () => {
      const game = getRight(Game.run()(newGame())(Game.start))

      expect(game.players[0].hand).toEqual(deck.cards.slice(0, handCount))
      expect(game.players[1].hand).toEqual(deck.cards.slice(handCount, handCount * 2))
      expect(game.stage).toBe(GameStage.Playing)
    })

    it("should send a card to the discard pile", () => {
      const game = getRight(Game.run()(newGame())(Game.start))

      expect(game.deck.cards).toHaveLength(deck.cards.length - game.discardPile.length - playersCount * handCount)
      expect(game.discardPile).toHaveLength(1)
    })

    it("should send a GameStarted event to all players", () => {
      const game = getRight(Game.run()(newGame())(Game.start))

      const events = game.events.filter(e => e.type === PlayerEventType.GameStarted)

      expect(events[0].target).toBe(p1.id)
      expect(events[1].target).toBe(p2.id)
    })

    it("should send a Play event to first player", () => {
      const game = getRight(Game.run()(newGame())(Game.start))
      const events = game.events.filter(e => e.type === PlayerEventType.PlayStage1)

      expect(events[0].target).toBe(p1.id)
    })
  })

  describe("While playing", () => {
    it("should return an error if wrong player tries to play", () => {
      const move = { some: "move" } as any
      const gameError = getLeft(Game.run()(newGame())(Game.start, Game.play(p2.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidPlayer)
    })

    describe("OnPass", () => {
      it("should move to next player", () => {
        const move = createMove(MoveType.Pass)
        const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))

        expect(game.currentPlayerIndex).toBe(1)
        expect(game.moveCounter).toBe(1)
      })
    })

    describe("On PickCard", () => {
      it("should assign a card to the player from the pile", () => {
        const gameAfterFirstPlayer = getRight(
          Game.run()(newGame())(Game.start, Game.play(p1.id, createMove(MoveType.DrawCard)), game =>
            Game.play(p1.id, createDiscardCardMove(game.players[0].hand[0]))(game),
          ),
        )
        const pileCard = gameAfterFirstPlayer.discardPile[0]
        const move = createMove(MoveType.PickCard)
        const game = getRight(Game.run()(gameAfterFirstPlayer)(Game.play(p2.id, move)))

        expect(game.players[1].hand.filter(Cards.equal(pileCard))).toHaveLength(1)
        expect(game.discardPile).toHaveLength(1)
        expect(game.deck.cards).toHaveLength(deck.cards.length - 2 - playersCount * handCount)
      })

      it("should ask for second stage move", () => {
        const gameAfterFirstPlayer = getRight(
          Game.run()(newGame())(Game.start, Game.play(p1.id, createMove(MoveType.DrawCard)), game =>
            Game.play(p1.id, createDiscardCardMove(game.players[0].hand[0]))(game),
          ),
        )
        const move = createMove(MoveType.PickCard)
        const game = getRight(Game.run()(gameAfterFirstPlayer)(Game.play(p2.id, move)))

        const events = game.events.filter(e => e.type === PlayerEventType.PlayStage2)

        expect(events[1].target).toBe(p2.id)
        expect(game.moveCounter).toBe(1)
        expect(game.currentPlayerIndex).toBe(1)
      })
    })

    describe("On DrawCard", () => {
      it("should assign a card to the player from the deck", () => {
        const move = createMove(MoveType.DrawCard)
        const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))
        const topDeckCard = deck.cards[handCount * playersCount + 1]

        expect(game.players[0].hand.filter(Cards.equal(topDeckCard))).toHaveLength(1)
        expect(game.discardPile).toHaveLength(1)
        expect(game.deck.cards).toHaveLength(deck.cards.length - 2 - playersCount * handCount)
      })

      it("should ask for second stage move", () => {
        const move = createMove(MoveType.DrawCard)
        const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))

        const events = game.events.filter(e => e.type === PlayerEventType.PlayStage2)

        expect(events[0].target).toBe(p1.id)
        expect(game.currentPlayerIndex).toBe(0)
      })
    })

    describe("On DiscardCard", () => {
      it("should send the player card to the pile", () => {
        const firstMove = createMove(MoveType.DrawCard)
        const gameAfterDraw = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, firstMove)))
        const cardToDiscard = randomElement(gameAfterDraw.players[0].hand)!
        const discardMove = createDiscardCardMove(cardToDiscard)
        const game = getRight(Game.run()(gameAfterDraw)(Game.play(p1.id, discardMove)))

        expect(game.players[0].hand.filter(Cards.equal(cardToDiscard))).toHaveLength(0)
        expect(Cards.equal(game.discardPile[0])(cardToDiscard)).toBeTruthy()
        expect(game.deck.cards).toHaveLength(deck.cards.length - 2 - playersCount * handCount)
      })
    })

    describe("it should end the game", () => {
      it("on Gin", () => {
        const move = createMove(MoveType.Gin)
        const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))

        expect(game.stage).toBe(GameStage.Ended)
      })

      it("on BigGin", () => {
        const firstPlayerHand = Cards.fromList("2C 3C 4C 5C 6C 2H 3H 4H 5H 6H")
        const cardToPick = Cards.fromSymbol("7H")
        const deck1 = Decks.fromCards([
          ...firstPlayerHand,
          cardToPick,
          ...deck.cards.filter(Cards.notIn([...firstPlayerHand, cardToPick])),
        ])
        const pickMove = createMove(MoveType.PickCard)
        const gameAfterPick = getRight(Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, pickMove)))

        expect(gameAfterPick.stage).toBe(GameStage.Ended)
      })

      it("on Knock", () => {
        const move = createMove(MoveType.Knock)
        const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))

        expect(game.stage).toBe(GameStage.Ended)
      })
    })
  })

  describe("Validation", () => {
    describe("Pass is valid", () => {
      it("if on first move", () => {
        const move = createMove(MoveType.Pass)
        const game = Game.run()(newGame())(Game.start, Game.play(p1.id, move))

        expect(isRight(game)).toBeTruthy()
      })

      it("if on second move and first player has passed", () => {
        const passMove = createMove(MoveType.Pass)
        const gameAfterFirstMove = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, passMove)))
        const game = Game.run()(gameAfterFirstMove)(Game.play(p2.id, passMove))

        expect(isRight(game)).toBeTruthy()
      })
    })

    describe("Pass is invalid", () => {
      it("if on third move", () => {
        const passMove = createMove(MoveType.Pass)
        const gameAfterTwoMoves = getRight(
          Game.run()(newGame())(Game.start, Game.play(p1.id, passMove), Game.play(p2.id, passMove)),
        )
        const game = Game.run()(gameAfterTwoMoves)(Game.play(p2.id, passMove))

        expect(isLeft(game)).toBeTruthy()
      })
    })

    describe("Draw", () => {
      it("is valid if player has 10 cards", () => {
        const drawMove = createMove(MoveType.DrawCard)
        const game = Game.run()(newGame())(Game.start, Game.play(p1.id, drawMove))

        expect(isRight(game)).toBeTruthy()
      })

      it("is invalid if player has more than 10 cards", () => {
        const drawMove = createMove(MoveType.DrawCard)
        const gameAfterTwoMoves = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, drawMove)))
        const game = Game.run()(gameAfterTwoMoves)(Game.play(p1.id, drawMove))

        expect(isLeft(game)).toBeTruthy()
      })
    })

    describe("Pick", () => {
      it("is valid if player has 10 cards", () => {
        const pickMove = createMove(MoveType.DrawCard)
        const game = Game.run()(newGame())(Game.start, Game.play(p1.id, pickMove))

        expect(isRight(game)).toBeTruthy()
      })

      it("is invalid if player has more than 10 cards", () => {
        const pickMove = createMove(MoveType.DrawCard)
        const gameAfterTwoMoves = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, pickMove)))
        const game = Game.run()(gameAfterTwoMoves)(Game.play(p1.id, pickMove))

        expect(isLeft(game)).toBeTruthy()
      })
    })

    describe("Discard", () => {
      it("is valid if player has 11 cards", () => {
        const drawMove = createMove(MoveType.DrawCard)
        const gameAfterDraw = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, drawMove)))
        const cardToDiscard = randomElement(gameAfterDraw.players[0].hand)!
        const discardMove = createDiscardCardMove(cardToDiscard)
        const game = Game.run()(gameAfterDraw)(Game.play(p1.id, discardMove))

        expect(isRight(game)).toBeTruthy()
      })

      it("is invalid if player has less than 11 cards", () => {
        const startedGame = getRight( Game.run()(newGame())(Game.start))
        const cardToDiscard = randomElement(startedGame.players[0].hand)!
        const discardMove = createDiscardCardMove(cardToDiscard)
        const game = Game.run()(newGame())(Game.start, Game.play(p1.id, discardMove))

        expect(isLeft(game)).toBeTruthy()
      })
    })

    it("can Knock if deadwood is worth less then 10", () => {
      const firstPlayerHand = Cards.fromList("2C 3C 4C 5C 6C 2H 3H 4H 2S 8S")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = createMove(MoveType.Knock)
      const game = Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move))

      expect(isRight(game)).toBeTruthy()
    })

    it("can't Knock if deadwood is higher then 10", () => {
      const firstPlayerHand = Cards.fromList("2C 3C 4C 5C 6C 2H 3H 4H 2S 9S")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = createMove(MoveType.Knock)
      const gameError = getLeft(Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidMove)
    })

    it("can Gin if deadwood has only one card", () => {
      const firstPlayerHand = Cards.fromList("2C 3C 4C 5C 6C 2H 3H 4H 2S")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = createMove(MoveType.Gin)
      const game = Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move))

      expect(isRight(game)).toBeTruthy()
    })

    it("can't Gin if deadwood has more than one card", () => {
      const firstPlayerHand = Cards.fromList("2C 3C 4C 5C 6C 2H 3H 4H 2S 9S")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = createMove(MoveType.Gin)
      const gameError = getLeft(Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidMove)
    })

    it("can BigGin if deadwood has no cards with 11 a 11 cards hand", () => {
      const firstPlayerHand = Cards.fromList("2C 3C 4C 5C 6C 2H 3H 4H 5H 6H 7H")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = createMove(MoveType.BigGin)
      const gameError = getLeft(Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidMove)
    })

    it("can't BigGin with 10 cards", () => {
      const firstPlayerHand = Cards.fromList("2C 3C 4C 5C 6C 2H 3H 4H 5H 6H")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = createMove(MoveType.BigGin)
      const gameError = getLeft(Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidMove)
    })

    it("can't BigGin if there is deadwood", () => {
      const firstPlayerHand = Cards.fromList("2C 3C 4C 5C 6C 2H 3H 4H 5H 6H 9D")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = createMove(MoveType.BigGin)
      const gameError = getLeft(Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidMove)
    })
  })
})
