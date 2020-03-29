import * as R from "ramda"
import { Player, PlayerId } from "../Players/model"
import * as Cards from "../Cards/domain"
import * as Melds from "../Game/melds"
import * as Players from "../Players/domain"
import * as Events from "../Events/domain"
import * as Decks from "../Deck/domain"
import { Deck } from "../Deck/model"
import { Environment, Notifier, NotificationType } from "../Environment/model"
import { GameAction, actionOf, actionErrorOf, GameResult, ask } from "../utils/actions"
import { GameStage, GameErrorType, Game } from "./model"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import { buildEnvironment } from "../Environment/domain"
import { PlayerEvent, PlayerEventType } from "../Events/model"
import { Move, MoveType, allSimpleMoves } from "../Moves/model"
import { Card } from "../Cards/model"
import * as Moves from "../Moves/domain"
import { lj } from "../utils/misc"

export const create = (players: Player[], deck: Deck): Game => ({
  countOfCardsInHand: 10,
  currentPlayerIndex: 0,
  deck,
  deckInfo: Decks.info(deck),
  discardPile: [],
  events: [],
  lastMove: undefined,
  moveCounter: 0,
  playerPassed: false,
  players,
  playersCount: players.length,
  stage: GameStage.Idle,
})

export const restart = (deck: Deck): GameAction => game =>
  act({
    ...game,
    currentPlayerIndex: 0,
    discardPile: [],
    events: [],
    moveCounter: 0,
    players: game.players.map(p => ({ ...p, hand: [] })),
    playerPassed: false,
    stage: GameStage.Idle,
    deck,
  })(start)

export const toPrintableJSON = (game: Game) => ({
  ...game,
  deck: Cards.toSymbols(game.deck.cards),
  discardPile: Cards.toSymbols(game.discardPile),
  players: game.players.map(p => ({
    ...p,
    hand: Cards.toSymbols(R.sort(Cards.orderByFaceValue, p.hand)),
  })),
  events: [],
})

type MoveActions = {
  [k: string]: GameAction[]
}

type MoveContext = { game: Game; player: Player; move: Move }
type MoveRules = {
  [k: string]: (context: MoveContext) => boolean
}

const withEnv = (f: (game: Game) => (env: Environment) => GameResult) => (game: Game) => pipe(ask(), chain(f(game)))

const notify: Notifier = (type, data = {}) => game => withEnv(game => env => env.notify(type, data)(game))(game)

const gameError = (type: GameErrorType) => ({
  type,
})

const gameErrorOf = (type: GameErrorType) => actionErrorOf<Game>(gameError(type))

export const act = (game: Game) => (...actions: GameAction[]) =>
  actions.reduce((acc, action) => pipe(acc, chain(action)), actionOf(game))

export const run = (environment?: Environment) => (game: Game) => (...actions: GameAction[]) =>
  act(game)(...actions)(environment || buildEnvironment())

export const currentPlayer = (game: Game) => game.players[game.currentPlayerIndex]

export const getPlayer = (game: Game, playerId: PlayerId) => game.players.find(p => p.id === playerId)!

const replacePlayer = (players: Player[], playerId: PlayerId, replaceFn: (player: Player) => Player) =>
  players.map(p => (p.id === playerId ? replaceFn(p) : p))

const replaceCurrentPlayer = (game: Game, replaceFn: (player: Player) => Player) =>
  replacePlayer(game.players, currentPlayer(game).id, replaceFn)

const toAllPlayers = (game: Game) => (type: PlayerEventType) =>
  game.players.map(p => Events.createPlayerEvent(type, p, game))

const toCurrentPlayer = (game: Game) => (type: PlayerEventType) =>
  Events.createPlayerEvent(type, currentPlayer(game), game)

const addEvents = (...events: PlayerEvent[]): GameAction => game =>
  actionOf({
    ...game,
    events: [...game.events, ...events],
  })

const addEventsToCurrentPlayer = (type: PlayerEventType): GameAction => game =>
  addEvents(toCurrentPlayer(game)(type))(game)

const distributeCards: GameAction = game => {
  const distribution = game.players.reduce(
    (acc, player) => {
      const drawnCards = Decks.drawDeckCards(acc.deck, 10)
      return {
        deck: drawnCards.deck,
        players: [...acc.players, Players.addCards(player, drawnCards.cards)],
      }
    },
    { deck: game.deck, players: [] as Player[] },
  )

  return actionOf({
    ...game,
    ...distribution,
  })
}

const validatePlayer = (playerId: PlayerId): GameAction => game =>
  currentPlayer(game).id === playerId ? actionOf(game) : gameErrorOf(GameErrorType.InvalidPlayer)

const moveRules: MoveRules = {
  [MoveType.Pass]: ({ game, player }) =>
    player.hand.length === 10 && (game.moveCounter === 0 || (game.moveCounter === 1 && game.playerPassed)),
  [MoveType.DiscardCard]: ({ player, move }) =>
    move.moveType === MoveType.DiscardCard &&
    player.hand.length === 11 &&
    (player.lastPickedCard === undefined || Cards.notEqual(player.lastPickedCard)(move.card)),
  [MoveType.PickCard]: ({ player }) => player.hand.length === 10,
  [MoveType.DrawCard]: ({ player }) => player.hand.length === 10,
  [MoveType.Knock]: ({ player }) => Melds.findMinimalDeadwood(player.hand).deadwoodValue <= 10,
  [MoveType.Gin]: ({ player }) => Melds.findMinimalDeadwood(player.hand).deadwood.length <= 1,
}

const moveIsValid = (game: Game) => (player: Player) => (move: Move) => moveRules[move.moveType]({ game, player, move })

const validateMove = (player: Player) => (move: Move): GameAction => game =>
  moveIsValid(game)(player)(move) ? actionOf(game) : gameErrorOf(GameErrorType.InvalidMove)

const drawCard: GameAction = game =>
  actionOf({
    ...game,
    discardPile: [...game.discardPile, game.deck.cards[0]],
    deck: {
      ...game.deck,
      cards: game.deck.cards.slice(1),
    },
  })

const playerPassed: GameAction = game =>
  actionOf({
    ...game,
    playerPassed: true,
  })

const moveToNextPlayer: GameAction = game =>
  act({
    ...game,
    players: replaceCurrentPlayer(game, p => ({ ...p, lastPickedCard: undefined })),
    currentPlayerIndex: (game.currentPlayerIndex + 1) % game.playersCount,
    moveCounter: game.moveCounter + 1,
  })(addEventsToCurrentPlayer(PlayerEventType.PlayStage1))

const drawCardToPlayer: GameAction = game => {
  const drawnCards = Decks.drawDeckCards(game.deck, 1)
  return actionOf({
    ...game,
    deck: drawnCards.deck,
    players: replaceCurrentPlayer(game, p => Players.addCards(p, drawnCards.cards)),
  })
}

const pickCardToPlayer: GameAction = game =>
  actionOf({
    ...game,
    discardPile: game.discardPile.slice(1),
    players: replaceCurrentPlayer(game, p => Players.pickCard(p, game.discardPile[0])),
  })

const discardCardFromPlayer = (cardToDiscard: Card): GameAction => game =>
  actionOf({
    ...game,
    discardPile: [cardToDiscard, ...game.discardPile],
    players: replaceCurrentPlayer(game, p => Players.removeCard(p, cardToDiscard)),
  })

const startPlaying: GameAction = game =>
  actionOf({
    ...game,
    stage: GameStage.Playing,
  })

const endGame = (move: Move | undefined): GameAction => game =>
  actionOf({
    ...game,
    lastMove: move,
    stage: GameStage.Ended,
  })

const checkEndOfDeck: GameAction = game => (game.deck.cards.length <= 2 ? endGame(undefined)(game) : actionOf(game))

const checkBigGin: GameAction = game =>
  currentPlayer(game).hand.length === 11 && Melds.findMinimalDeadwood(currentPlayer(game).hand).deadwood.length === 0
    ? endGame(Moves.create(MoveType.BigGin))(game)
    : actionOf(game)

export const start: GameAction = game =>
  act(game)(
    startPlaying,
    distributeCards,
    drawCard,
    addEvents(...toAllPlayers(game)(PlayerEventType.GameStarted), toCurrentPlayer(game)(PlayerEventType.PlayStage1)),
    notify(NotificationType.Started),
  )

export const extractEvents: GameAction = game =>
  actionOf({
    ...game,
    events: [],
  })

const moveActions = (move: Move): MoveActions => ({
  [MoveType.Pass]: [playerPassed, moveToNextPlayer],
  [MoveType.PickCard]: [pickCardToPlayer, addEventsToCurrentPlayer(PlayerEventType.PlayStage2)],
  [MoveType.DrawCard]: [drawCardToPlayer, addEventsToCurrentPlayer(PlayerEventType.PlayStage2)],
  [MoveType.Knock]: [endGame(move)],
  [MoveType.Gin]: [endGame(move)],
})

export const doMove = (move: Move): GameAction => game =>
  move.moveType === MoveType.DiscardCard
    ? act(game)(discardCardFromPlayer(move.card), moveToNextPlayer)
    : act(game)(...moveActions(move)[move.moveType])

export const play = (playerId: PlayerId, move: Move): GameAction => game =>
  act(game)(
    validatePlayer(playerId),
    validateMove(getPlayer(game, playerId))(move),
    doMove(move),
    checkEndOfDeck,
    checkBigGin,
    notify(NotificationType.Played, { playerId, move }),
  )

export const validMoves = (game: Game) => validMovesForPlayer(currentPlayer(game))(game)

export const validMovesForPlayer = (player: Player) => (game: Game) =>
  [...allSimpleMoves.map(Moves.create), ...player.hand.map(Moves.createDiscardCardMove)].filter(
    moveIsValid(game)(player),
  )

const calcPlayerScore = (player: Player, knockPlayer: Player, deadwoodValue: number, otherDeadwoodValue: number) => {
  const deadwoodDifference = deadwoodValue - otherDeadwoodValue

  const ginOrBigGinScore = otherDeadwoodValue + (player.hand.length === 11 ? 31 : 25)
  const knockScore =
    player.id === knockPlayer.id
      ? deadwoodDifference < 0
        ? -deadwoodDifference
        : 0
      : deadwoodDifference < 0
      ? 25 - deadwoodDifference
      : 0

  return deadwoodValue === 0 ? ginOrBigGinScore : knockScore
}

const calcMeldsScore = (game: Game) => {
  const melds1 = Melds.findMinimalDeadwood(game.players[0].hand)
  const melds2 = Melds.findMinimalDeadwood(game.players[1].hand)

  return {
    scores: [
      calcPlayerScore(game.players[0], currentPlayer(game), melds1.deadwoodValue, melds2.deadwoodValue),
      calcPlayerScore(game.players[1], currentPlayer(game), melds2.deadwoodValue, melds1.deadwoodValue),
    ],
  }
}

export const result = (game: Game) =>
  game.lastMove
    ? calcMeldsScore(game)
    : {
        scores: [0, 0],
      }

