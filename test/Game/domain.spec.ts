import * as Cards from "../../src/Cards/domain"
import * as Players from "../../src/Players/domain"
import * as Games from "../../src/Game/domain"
import * as Decks from "../../src/Deck/domain"
import { GameStage, GameErrorType } from "../../src/Game/model"
import { getRight, getLeft } from "./helpers"
import { PlayerEventType } from "../../src/Events/model"
import { create, createDiscardCardMove } from "../../src/Moves/domain"
import { MoveType } from "../../src/Moves/model"
import { isRight, isLeft } from "fp-ts/lib/Either"
import { range } from "ramda"
import { GameAction } from "../../src/utils/actions"

describe("game", () => {
  const fullDeck = Decks.create()
  const p1 = Players.create("p1", "Player 1")
  const p2 = Players.create("p2", "Player 2")
  const players = [p1, p2]
  const handCount = 10
  const playersCount = 2

  const newGame = () => Games.create(players, fullDeck)

  const passCardAction: GameAction = game => Games.play(Games.currentPlayer(game).id, create(MoveType.Pass))(game)
  const drawCardAction: GameAction = game => Games.play(Games.currentPlayer(game).id, create(MoveType.DrawCard))(game)
  const pickCardAction: GameAction = game => Games.play(Games.currentPlayer(game).id, create(MoveType.PickCard))(game)
  const discardFirstCardAction: GameAction = game =>
    Games.play(Games.currentPlayer(game).id, createDiscardCardMove(Games.currentPlayer(game).hand[0]))(game)

  it("should create a game", () => {
    const game = Games.create(players, fullDeck)

    expect(handCount).toBe(10)
    expect(game.currentPlayerIndex).toBe(0)
    expect(game.discardPile).toEqual([])
    expect(game.moveCounter).toBe(0)
    expect(game.players).toBe(players)
    expect(game.playersCount).toBe(2)
    expect(game.stage).toBe(GameStage.Idle)
    expect(game.deck).toBe(fullDeck)
    expect(game.events).toEqual([])
  })

  describe("On Start", () => {
    it("should distribute cards", () => {
      const game = getRight(Games.run()(newGame())(Games.start))

      expect(game.players[0].hand).toEqual(fullDeck.cards.slice(0, handCount))
      expect(game.players[1].hand).toEqual(fullDeck.cards.slice(handCount, handCount * 2))
      expect(game.stage).toBe(GameStage.Playing)
      expect(game.currentPlayerIndex).toBe(0)
      expect(game.moveCounter).toBe(0)
    })

    it("should clear previous state on restart", () => {
      const game = getRight(
        Games.run()(newGame())(
          Games.start,
          drawCardAction,
          discardFirstCardAction,
          pickCardAction,
          discardFirstCardAction,
          Games.restart(fullDeck),
        ),
      )

      expect(game.discardPile.length).toBe(1)
      expect(game.players[0].hand).toHaveLength(10)
      expect(game.currentPlayerIndex).toBe(0)
      expect(game.moveCounter).toBe(0)
    })

    it("should send a card to the discard pile", () => {
      const game = getRight(Games.run()(newGame())(Games.start))

      expect(game.deck.cards).toHaveLength(fullDeck.cards.length - game.discardPile.length - playersCount * handCount)
      expect(game.discardPile).toHaveLength(1)
    })

    it("should send a GameStarted event to all players", () => {
      const game = getRight(Games.run()(newGame())(Games.start))

      const events = game.events.filter(e => e.type === PlayerEventType.GameStarted)

      expect(events[0].target).toBe(p1.id)
      expect(events[1].target).toBe(p2.id)
    })

    it("should send a Play event to first player", () => {
      const game = getRight(Games.run()(newGame())(Games.start))
      const events = game.events.filter(e => e.type === PlayerEventType.PlayStage1)

      expect(events[0].target).toBe(p1.id)
    })
  })

  describe("While playing", () => {
    it("should send an event for the next player", () => {
      const game = getRight(Games.run()(newGame())(Games.start, passCardAction))
      const events = game.events.filter(e => e.target === p2.id && e.type === PlayerEventType.PlayStage1)

      expect(events).toHaveLength(1)
    })

    it("should clear lastPickedCard from the player after playing", () => {
      const game = getRight(Games.run()(newGame())(Games.start, pickCardAction, discardFirstCardAction))

      expect(game.players[0].lastPickedCard).toBeUndefined()
    })

    it("should return an error if wrong player tries to play", () => {
      const move = { some: "move" } as any
      const gameError = getLeft(Games.run()(newGame())(Games.start, Games.play(p2.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidPlayer)
    })

    describe("OnPass", () => {
      it("should move to next player", () => {
        const move = create(MoveType.Pass)
        const game = getRight(Games.run()(newGame())(Games.start, Games.play(p1.id, move)))

        expect(game.currentPlayerIndex).toBe(1)
        expect(game.moveCounter).toBe(1)
      })
    })

    describe("On PickCard", () => {
      it("should assign a card to the player from the pile", () => {
        const gameAfterFirstPlayer = getRight(
          Games.run()(newGame())(Games.start, drawCardAction, discardFirstCardAction),
        )
        const pileCard = gameAfterFirstPlayer.discardPile[0]
        const game = getRight(Games.run()(gameAfterFirstPlayer)(pickCardAction))

        expect(game.players[1].hand.filter(Cards.equal(pileCard))).toHaveLength(1)
        expect(game.discardPile).toHaveLength(1)
        expect(game.deck.cards).toHaveLength(fullDeck.cards.length - 2 - playersCount * handCount)
      })

      it("should ask for second stage move", () => {
        const gameAfterFirstPlayer = getRight(
          Games.run()(newGame())(Games.start, drawCardAction, discardFirstCardAction),
        )
        const game = getRight(Games.run()(gameAfterFirstPlayer)(pickCardAction))

        const events = game.events.filter(e => e.type === PlayerEventType.PlayStage2)

        expect(events[1].target).toBe(p2.id)
        expect(game.moveCounter).toBe(1)
        expect(game.currentPlayerIndex).toBe(1)
      })
    })

    describe("On DrawCard", () => {
      it("should assign a card to the player from the deck", () => {
        const game = getRight(Games.run()(newGame())(Games.start, drawCardAction))
        const topDeckCard = fullDeck.cards[handCount * playersCount + 1]

        expect(game.players[0].hand.filter(Cards.equal(topDeckCard))).toHaveLength(1)
        expect(game.discardPile).toHaveLength(1)
        expect(game.deck.cards).toHaveLength(fullDeck.cards.length - 2 - playersCount * handCount)
      })

      it("should ask for second stage move", () => {
        const game = getRight(Games.run()(newGame())(Games.start, drawCardAction))

        const events = game.events.filter(e => e.type === PlayerEventType.PlayStage2)

        expect(events[0].target).toBe(p1.id)
        expect(game.currentPlayerIndex).toBe(0)
      })
    })

    describe("On DiscardCard", () => {
      it("should send the player card to the pile", () => {
        const game = getRight(Games.run()(newGame())(Games.start, drawCardAction, discardFirstCardAction))
        const discardCard = game.discardPile[0]

        expect(game.players[0].hand.filter(Cards.equal(discardCard))).toHaveLength(0)
        expect(Cards.equal(game.discardPile[0])(discardCard)).toBeTruthy()
        expect(game.deck.cards).toHaveLength(fullDeck.cards.length - 2 - playersCount * handCount)
      })
    })

    describe("it should end the game", () => {
      it("if there is only two cards left in the deck", () => {
        const startedGame = getRight(Games.run()(newGame())(Games.start))
        const cardsLeft = startedGame.deck.cards.length
        const actions = range(0, cardsLeft - 2).reduce(
          actions => [...actions, drawCardAction, discardFirstCardAction],
          [] as GameAction[],
        )
        const endedGame = getRight(Games.run()(startedGame)(...actions))

        expect(endedGame.stage).toBe(GameStage.Ended)
      })

      it("on Gin", () => {
        const move = create(MoveType.Gin)
        const game = getRight(Games.run()(newGame())(Games.start, Games.play(p1.id, move)))

        expect(game.stage).toBe(GameStage.Ended)
      })

      it("on BigGin", () => {
        const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 5H 6H")
        const cardToPick = Cards.fromSymbol("7H")
        const deck = Decks.fromCards([
          ...firstPlayerHand,
          cardToPick,
          ...fullDeck.cards.filter(Cards.notIn([...firstPlayerHand, cardToPick])),
        ])
        const gameAfterPick = getRight(Games.run()(Games.create(players, deck))(Games.start, pickCardAction))

        expect(gameAfterPick.stage).toBe(GameStage.Ended)
      })

      it("on Knock", () => {
        const move = create(MoveType.Knock)
        const game = getRight(Games.run()(newGame())(Games.start, Games.play(p1.id, move)))

        expect(game.stage).toBe(GameStage.Ended)
      })
    })
  })

  describe("Validation", () => {
    describe("Pass is valid", () => {
      it("if on first move", () => {
        const game = Games.run()(newGame())(Games.start, passCardAction)

        expect(isRight(game)).toBeTruthy()
      })

      it("if on second move and first player has passed", () => {
        const gameAfterFirstMove = getRight(Games.run()(newGame())(Games.start, passCardAction))
        const game = Games.run()(gameAfterFirstMove)(passCardAction)

        expect(isRight(game)).toBeTruthy()
      })
    })

    describe("Pass is invalid", () => {
      it("after draw", () => {
        const gameAfterDraw = getRight(Games.run()(newGame())(Games.start, drawCardAction))
        const game = Games.run()(gameAfterDraw)(passCardAction)

        expect(isLeft(game)).toBeTruthy()
      })

      it("after pick", () => {
        const gameAfterPick = getRight(Games.run()(newGame())(Games.start, pickCardAction))
        const game = Games.run()(gameAfterPick)(passCardAction)

        expect(isLeft(game)).toBeTruthy()
      })

      it("if on third move", () => {
        const gameAfterTwoMoves = getRight(Games.run()(newGame())(Games.start, passCardAction, passCardAction))
        const game = Games.run()(gameAfterTwoMoves)(passCardAction)

        expect(isLeft(game)).toBeTruthy()
      })

      it("if on second move and first player hasn't pass", () => {
        const gameAfterFirstPlayer = getRight(
          Games.run()(newGame())(Games.start, pickCardAction, discardFirstCardAction),
        )
        const game = Games.run()(gameAfterFirstPlayer)(passCardAction)

        expect(isLeft(game)).toBeTruthy()
      })
    })

    describe("Draw", () => {
      it("is valid if player has 10 cards", () => {
        const game = Games.run()(newGame())(Games.start, drawCardAction)

        expect(isRight(game)).toBeTruthy()
      })

      it("is invalid if player has more than 10 cards", () => {
        const gameAfterDraw = getRight(Games.run()(newGame())(Games.start, drawCardAction))
        const game = Games.run()(gameAfterDraw)(drawCardAction)

        expect(isLeft(game)).toBeTruthy()
      })
    })

    describe("Pick", () => {
      it("is valid if player has 10 cards", () => {
        const game = Games.run()(newGame())(Games.start, drawCardAction)

        expect(isRight(game)).toBeTruthy()
      })

      it("is invalid if player has more than 10 cards", () => {
        const gameAfterPick = getRight(Games.run()(newGame())(Games.start, pickCardAction))
        const game = Games.run()(gameAfterPick)(pickCardAction)

        expect(isLeft(game)).toBeTruthy()
      })
    })

    describe("Discard", () => {
      it("is valid if player has 11 cards", () => {
        const gameAfterDraw = getRight(Games.run()(newGame())(Games.start, drawCardAction))
        const game = Games.run()(gameAfterDraw)(discardFirstCardAction)

        expect(isRight(game)).toBeTruthy()
      })

      it("is invalid if player has less than 11 cards", () => {
        const game = Games.run()(newGame())(Games.start, discardFirstCardAction)

        expect(isLeft(game)).toBeTruthy()
      })

      it("is invalid if player discards the picked card", () => {
        const gameStarted = getRight(Games.run()(newGame())(Games.start))
        const gameAfterPick = getRight(Games.run()(gameStarted)(pickCardAction))
        const pickedCard = gameStarted.discardPile[0]
        const discardPickedCardMove = createDiscardCardMove(pickedCard)
        const game = Games.run()(gameAfterPick)(Games.play(p1.id, discardPickedCardMove))

        expect(isLeft(game)).toBeTruthy()
      })
    })

    it("can Knock if deadwood is worth less then 10", () => {
      const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 2S 8S")
      const deck = Decks.fromCards([...firstPlayerHand, ...fullDeck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = create(MoveType.Knock)
      const game = Games.run()(Games.create(players, deck))(Games.start, Games.play(p1.id, move))

      expect(isRight(game)).toBeTruthy()
    })

    it("can't Knock if deadwood is higher then 10", () => {
      const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 2S 9S")
      const deck = Decks.fromCards([...firstPlayerHand, ...fullDeck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = create(MoveType.Knock)
      const gameError = getLeft(Games.run()(Games.create(players, deck))(Games.start, Games.play(p1.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidMove)
    })

    it("can Gin if deadwood has only one card", () => {
      const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 2S")
      const deck = Decks.fromCards([...firstPlayerHand, ...fullDeck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = create(MoveType.Gin)
      const game = Games.run()(Games.create(players, deck))(Games.start, Games.play(p1.id, move))

      expect(isRight(game)).toBeTruthy()
    })

    it("can't Gin if deadwood has more than one card", () => {
      const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 2S 9S")
      const deck = Decks.fromCards([...firstPlayerHand, ...fullDeck.cards.filter(Cards.notIn(firstPlayerHand))])
      const move = create(MoveType.Gin)
      const gameError = getLeft(Games.run()(Games.create(players, deck))(Games.start, Games.play(p1.id, move)))

      expect(gameError.type).toBe(GameErrorType.InvalidMove)
    })
  })

  describe("Scoring", () => {
    it("when first player gets BigGin it gets 31 + deadwood difference", () => {
      const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 5H 6H")
      const secondPlayerHand = Cards.fromSymbols("7C 8C 9C 10C JC QC KC 2D 5D 7D")
      const topPile = Cards.fromSymbol("7H")
      const firstCards = [...firstPlayerHand, ...secondPlayerHand, topPile]
      const deck = Decks.fromCards([...firstCards, ...fullDeck.cards.filter(Cards.notIn(firstCards))])
      const game = getRight(Games.run()(Games.create(players, deck))(Games.start, pickCardAction))

      const result = Games.result(game)

      const expectedResult = {
        scores: [31 + 14, 0],
      }

      expect(result).toEqual(expectedResult)
    })

    it("when second player gets BigGin it gets 31 + deadwood difference", () => {
      const firstPlayerHand = Cards.fromSymbols("7C 8C 9C 10C JC QC KC 2D 5D 7D")
      const secondPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 5H 6H")
      const topPile = Cards.fromSymbol("7H")
      const firstCards = [...firstPlayerHand, ...secondPlayerHand, topPile]
      const deck = Decks.fromCards([...firstCards, ...fullDeck.cards.filter(Cards.notIn(firstCards))])
      const game = getRight(Games.run()(Games.create(players, deck))(Games.start, passCardAction, pickCardAction))

      const result = Games.result(game)

      const expectedResult = {
        scores: [0, 31 + 14],
      }

      expect(result).toEqual(expectedResult)
    })

    it("when first player does Gin gets 25 + deadwood difference", () => {
      const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 5H 6H")
      const secondPlayerHand = Cards.fromSymbols("7C 8C 9C 10C JC QC KC 2D 5D 7D")
      const firstCards = [...firstPlayerHand, ...secondPlayerHand]
      const deck = Decks.fromCards([...firstCards, ...fullDeck.cards.filter(Cards.notIn(firstCards))])
      const move = create(MoveType.Gin)
      const game = getRight(Games.run()(Games.create(players, deck))(Games.start, Games.play(p1.id, move)))

      const result = Games.result(game)

      const expectedResult = {
        scores: [25 + 14, 0],
      }

      expect(result).toEqual(expectedResult)
    })

    it("when second player does Gin gets 25 + deadwood difference", () => {
      const firstPlayerHand = Cards.fromSymbols("7C 8C 9C 10C JC QC KC 2D 5D 7D")
      const secondPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 5H 6H")
      const firstCards = [...firstPlayerHand, ...secondPlayerHand]
      const deck = Decks.fromCards([...firstCards, ...fullDeck.cards.filter(Cards.notIn(firstCards))])
      const move = create(MoveType.Gin)
      const game = getRight(
        Games.run()(Games.create(players, deck))(Games.start, passCardAction, Games.play(p2.id, move)),
      )

      const result = Games.result(game)

      const expectedResult = {
        scores: [0, 25 + 14],
      }

      expect(result).toEqual(expectedResult)
    })

    describe("when first player Knocks", () => {
      it("if deadwood is lower he wins deadwood difference", () => {
        const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 5H 3S")
        const secondPlayerHand = Cards.fromSymbols("7C 8C 9C 10C JC QC KC 2D 5D 7D")
        const firstCards = [...firstPlayerHand, ...secondPlayerHand]
        const deck = Decks.fromCards([...firstCards, ...fullDeck.cards.filter(Cards.notIn(firstCards))])
        const move = create(MoveType.Knock)
        const game = getRight(Games.run()(Games.create(players, deck))(Games.start, Games.play(p1.id, move)))

        const result = Games.result(game)

        const expectedResult = {
          scores: [14 - 3, 0],
        }

        expect(result).toEqual(expectedResult)
      })

      it("if first player knocks and deadwood is higher opponent gets 25 + deadwood difference", () => {
        const firstPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 5H 9S")
        const secondPlayerHand = Cards.fromSymbols("7C 8C 9C 10C JC QC KC 2D 2S 3S")
        const firstCards = [...firstPlayerHand, ...secondPlayerHand]
        const deck = Decks.fromCards([...firstCards, ...fullDeck.cards.filter(Cards.notIn(firstCards))])
        const move = create(MoveType.Knock)
        const game = getRight(Games.run()(Games.create(players, deck))(Games.start, Games.play(p1.id, move)))

        const result = Games.result(game)

        const expectedResult = {
          scores: [0, 25 + 9 - 7],
        }

        expect(result).toEqual(expectedResult)
      })
    })

    describe("when second player Knocks", () => {
      it("if deadwood is lower he wins deadwood difference", () => {
        const firstPlayerHand = Cards.fromSymbols("7C 8C 9C 10C JC QC KC 2D 5D 7D")
        const secondPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 5H 3S")
        const firstCards = [...firstPlayerHand, ...secondPlayerHand]
        const deck = Decks.fromCards([...firstCards, ...fullDeck.cards.filter(Cards.notIn(firstCards))])
        const move = create(MoveType.Knock)
        const game = getRight(
          Games.run()(Games.create(players, deck))(Games.start, passCardAction, Games.play(p2.id, move)),
        )

        const result = Games.result(game)

        const expectedResult = {
          scores: [0, 14 - 3],
        }

        expect(result).toEqual(expectedResult)
      })

      it("if deadwood is higher opponent gets 25 + deadwood difference", () => {
        const firstPlayerHand = Cards.fromSymbols("7C 8C 9C 10C JC QC KC 2D 2S 3S")
        const secondPlayerHand = Cards.fromSymbols("2C 3C 4C 5C 6C 2H 3H 4H 5H 9S")
        const firstCards = [...firstPlayerHand, ...secondPlayerHand]
        const deck = Decks.fromCards([...firstCards, ...fullDeck.cards.filter(Cards.notIn(firstCards))])
        const move = create(MoveType.Knock)
        const game = getRight(
          Games.run()(Games.create(players, deck))(Games.start, passCardAction, Games.play(p2.id, move)),
        )

        const result = Games.result(game)

        const expectedResult = {
          scores: [25 + 9 - 7, 0],
        }

        expect(result).toEqual(expectedResult)
      })
    })

    it("if deck runs out of cards it's a tie", () => {
      const startedGame = getRight(Games.run()(newGame())(Games.start))
      const cardsLeft = startedGame.deck.cards.length
      const actions = range(0, cardsLeft - 2).reduce(
        actions => [...actions, drawCardAction, discardFirstCardAction],
        [] as GameAction[],
      )
      const endedGame = getRight(Games.run()(startedGame)(...actions))

      const result = Games.result(endedGame)

      const expectedResult = {
        scores: [0, 0],
      }

      expect(result).toEqual(expectedResult)
    })
  })
})
