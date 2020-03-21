import * as Cards from "../../src/Cards/domain"
import * as Players from "../../src/Players/domain"
import * as Game from "../../src/Game/domain"
import * as Decks from "../../src/Deck/domain"
import { GameStage, GameErrorType } from "../../src/Game/model"
import { getRight, getLeft } from "./helpers"
import { PlayerEventType } from "../../src/Events/model"
import { create, createDiscardCardMove } from "../../src/Moves/domain"
import { MoveType } from "../../src/Moves/model"
import { randomElement } from "../../src/utils/misc"
import { isRight, isLeft } from "fp-ts/lib/Either"
import { range } from "ramda"
import { GameAction } from "../../src/utils/actions"

describe("game", () => {
  const deck = Decks.create()
  const p1 = Players.create("p1", "Player 1")
  const p2 = Players.create("p2", "Player 2")
  const players = [p1, p2]
  const handCount = 10
  const playersCount = 2

  const newGame = () => Game.create(players, deck)

  const drawCardAction: GameAction = game => Game.play(Game.currentPlayer(game).id, create(MoveType.DrawCard))(game)
  const pickCardAction: GameAction = game => Game.play(Game.currentPlayer(game).id, create(MoveType.PickCard))(game)
  const discardFirstCardAction: GameAction = game =>
    Game.play(Game.currentPlayer(game).id, createDiscardCardMove(Game.currentPlayer(game).hand[0]))(game)

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
    it("should send an event for the next player", () => {
      const move = create(MoveType.Pass)
      const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))
      const events = game.events.filter(e => e.target === p2.id && e.type === PlayerEventType.PlayStage1)

      expect(events).toHaveLength(1)
    })

    it("should return an error if wrong player tries to play", () => {
      const move = { some: "move" } as any
      const gameError = getLeft(Game.run()(newGame())(Game.start, Game.play(p2.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidPlayer)
    })

    describe("OnPass", () => {
      it("should move to next player", () => {
        const move = create(MoveType.Pass)
        const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))

        expect(game.currentPlayerIndex).toBe(1)
        expect(game.moveCounter).toBe(1)
      })
    })

    describe("On PickCard", () => {
      it("should assign a card to the player from the pile", () => {
        const gameAfterFirstPlayer = getRight(Game.run()(newGame())(Game.start, drawCardAction, discardFirstCardAction))
        const pileCard = gameAfterFirstPlayer.discardPile[0]
        const game = getRight(Game.run()(gameAfterFirstPlayer)(pickCardAction))

        expect(game.players[1].hand.filter(Cards.equal(pileCard))).toHaveLength(1)
        expect(game.discardPile).toHaveLength(1)
        expect(game.deck.cards).toHaveLength(deck.cards.length - 2 - playersCount * handCount)
      })

      it("should ask for second stage move", () => {
        const gameAfterFirstPlayer = getRight(Game.run()(newGame())(Game.start, drawCardAction, discardFirstCardAction))
        const game = getRight(Game.run()(gameAfterFirstPlayer)(pickCardAction))

        const events = game.events.filter(e => e.type === PlayerEventType.PlayStage2)

        expect(events[1].target).toBe(p2.id)
        expect(game.moveCounter).toBe(1)
        expect(game.currentPlayerIndex).toBe(1)
      })
    })

    describe("On DrawCard", () => {
      it("should assign a card to the player from the deck", () => {
        const game = getRight(Game.run()(newGame())(Game.start, drawCardAction))
        const topDeckCard = deck.cards[handCount * playersCount + 1]

        expect(game.players[0].hand.filter(Cards.equal(topDeckCard))).toHaveLength(1)
        expect(game.discardPile).toHaveLength(1)
        expect(game.deck.cards).toHaveLength(deck.cards.length - 2 - playersCount * handCount)
      })

      it("should ask for second stage move", () => {
        const game = getRight(Game.run()(newGame())(Game.start, drawCardAction))

        const events = game.events.filter(e => e.type === PlayerEventType.PlayStage2)

        expect(events[0].target).toBe(p1.id)
        expect(game.currentPlayerIndex).toBe(0)
      })
    })

    describe("On DiscardCard", () => {
      it("should send the player card to the pile", () => {
        const game = getRight(Game.run()(newGame())(Game.start, drawCardAction, discardFirstCardAction))
        const discardCard = game.discardPile[0]

        expect(game.players[0].hand.filter(Cards.equal(discardCard))).toHaveLength(0)
        expect(Cards.equal(game.discardPile[0])(discardCard)).toBeTruthy()
        expect(game.deck.cards).toHaveLength(deck.cards.length - 2 - playersCount * handCount)
      })
    })

    describe("it should end the game", () => {
      it("if there is only two cards left in the deck", () => {
        const startedGame = getRight(Game.run()(newGame())(Game.start))
        const cardsLeft = startedGame.deck.cards.length
        const actions = range(0, cardsLeft - 2).reduce(
          actions => [...actions, drawCardAction, discardFirstCardAction],
          [] as GameAction[],
        )
        const endedGame = getRight(Game.run()(startedGame)(...actions))

        expect(endedGame.stage).toBe(GameStage.Ended)
      })

      it("on Gin", () => {
        const move = create(MoveType.Gin)
        const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))

        expect(game.stage).toBe(GameStage.Ended)
      })

      it("on BigGin", () => {
        const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 5H 6H")
        const cardToPick = Cards.fromSymbol("7H")
        const deck1 = Decks.fromCards([
          ...firstPlayerHand,
          cardToPick,
          ...deck.cards.filter(Cards.notIn([...firstPlayerHand, cardToPick])),
        ])
        const gameAfterPick = getRight(Game.run()(Game.create(players, deck1))(Game.start, pickCardAction))

        expect(gameAfterPick.stage).toBe(GameStage.Ended)
      })

      it("on Knock", () => {
        const move = create(MoveType.Knock)
        const game = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, move)))

        expect(game.stage).toBe(GameStage.Ended)
      })
    })
  })

  describe("Validation", () => {
    describe("Pass is valid", () => {
      it("if on first move", () => {
        const move = create(MoveType.Pass)
        const game = Game.run()(newGame())(Game.start, Game.play(p1.id, move))

        expect(isRight(game)).toBeTruthy()
      })

      it("if on second move and first player has passed", () => {
        const passMove = create(MoveType.Pass)
        const gameAfterFirstMove = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, passMove)))
        const game = Game.run()(gameAfterFirstMove)(Game.play(p2.id, passMove))

        expect(isRight(game)).toBeTruthy()
      })
    })

    describe("Pass is invalid", () => {
      it("if on third move", () => {
        const passMove = create(MoveType.Pass)
        const gameAfterTwoMoves = getRight(
          Game.run()(newGame())(Game.start, Game.play(p1.id, passMove), Game.play(p2.id, passMove)),
        )
        const game = Game.run()(gameAfterTwoMoves)(Game.play(p2.id, passMove))

        expect(isLeft(game)).toBeTruthy()
      })
    })

    describe("Draw", () => {
      it("is valid if player has 10 cards", () => {
        const drawMove = create(MoveType.DrawCard)
        const game = Game.run()(newGame())(Game.start, Game.play(p1.id, drawMove))

        expect(isRight(game)).toBeTruthy()
      })

      it("is invalid if player has more than 10 cards", () => {
        const drawMove = create(MoveType.DrawCard)
        const gameAfterTwoMoves = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, drawMove)))
        const game = Game.run()(gameAfterTwoMoves)(Game.play(p1.id, drawMove))

        expect(isLeft(game)).toBeTruthy()
      })
    })

    describe("Pick", () => {
      it("is valid if player has 10 cards", () => {
        const pickMove = create(MoveType.DrawCard)
        const game = Game.run()(newGame())(Game.start, Game.play(p1.id, pickMove))

        expect(isRight(game)).toBeTruthy()
      })

      it("is invalid if player has more than 10 cards", () => {
        const pickMove = create(MoveType.DrawCard)
        const gameAfterTwoMoves = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, pickMove)))
        const game = Game.run()(gameAfterTwoMoves)(Game.play(p1.id, pickMove))

        expect(isLeft(game)).toBeTruthy()
      })
    })

    describe("Discard", () => {
      it("is valid if player has 11 cards", () => {
        const drawMove = create(MoveType.DrawCard)
        const gameAfterDraw = getRight(Game.run()(newGame())(Game.start, Game.play(p1.id, drawMove)))
        const cardToDiscard = randomElement(gameAfterDraw.players[0].hand)!
        const discardMove = createDiscardCardMove(cardToDiscard)
        const game = Game.run()(gameAfterDraw)(Game.play(p1.id, discardMove))

        expect(isRight(game)).toBeTruthy()
      })

      it("is invalid if player has less than 11 cards", () => {
        const game = Game.run()(newGame())(Game.start, discardFirstCardAction)

        expect(isLeft(game)).toBeTruthy()
      })
    })

    it("can Knock if deadwood is worth less then 10", () => {
      const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 2S 8S")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = create(MoveType.Knock)
      const game = Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move))

      expect(isRight(game)).toBeTruthy()
    })

    it("can't Knock if deadwood is higher then 10", () => {
      const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 2S 9S")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = create(MoveType.Knock)
      const gameError = getLeft(Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidMove)
    })

    it("can Gin if deadwood has only one card", () => {
      const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 2S")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = create(MoveType.Gin)
      const game = Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move))

      expect(isRight(game)).toBeTruthy()
    })

    it("can't Gin if deadwood has more than one card", () => {
      const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 2S 9S")
      const deck1 = Decks.fromCards([...firstPlayerHand, ...deck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = create(MoveType.Gin)
      const gameError = getLeft(Game.run()(Game.create(players, deck1))(Game.start, Game.play(p1.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidMove)
    })
  })
})
