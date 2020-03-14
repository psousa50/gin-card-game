import { Player, PlayerId } from "../Players/model"
import * as Melds from "../Game/melds"
import * as Players from "../Players/domain"
import * as Events from "../Events/domain"
import * as Decks from "../Deck/domain"
import { Deck } from "../Deck/model"
import { Environment } from "../Environment/model"
import { GameAction, actionOf, ask, GameResult, actionErrorOf } from "../utils/actions"
import { Game, GameStage, GameErrorType } from "./model"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import { buildEnvironment } from "../Environment/domain"
import { PlayerEvent, PlayerEventType } from "../Events/model"
import { Move, MoveType } from "../Moves/model"
import { Card } from "../Cards/model"

export const create = (players: Player[], deck: Deck): Game => ({
  countOfCardsInHand: 10,
  currentPlayerIndex: 0,
  discardPile: [],
  events: [],
  moveCounter: 0,
  players,
  playersCount: players.length,
  stage: GameStage.Idle,
  deck,
})

type MoveActions = {
  [k: string]: GameAction[]
}

type MoveRules = {
  [k: string]: (game: Game) => boolean
}

// const withEnv = (f: (game: Game) => (env: Environment) => GameResult) => (game: Game) => pipe(ask(), chain(f(game)))

const gameError = (type: GameErrorType) => ({
  type,
})
const gameErrorOf = (type: GameErrorType) => actionErrorOf<Game>(gameError(type))

export const act = (game: Game) => (...actions: GameAction[]) =>
  actions.reduce((acc, action) => pipe(acc, chain(action)), actionOf(game))

export const run = (environment?: Environment) => (game: Game) => (...actions: GameAction[]) =>
  act(game)(...actions)(environment || buildEnvironment())

const currentPlayer = (game: Game) => game.players[game.currentPlayerIndex]

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
      const d1 = Decks.drawCards(acc.deck, 10)
      return {
        deck: d1.deck,
        players: [...acc.players, Players.addCards(player, d1.cards)],
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

const canPass = (game: Game) =>
  currentPlayer(game).hand.length === 10 &&
  (game.moveCounter === 0 || (game.moveCounter === 1 && game.discardPile.length === 1))

const moveRules: MoveRules = {
  [MoveType.Pass]: canPass,
  [MoveType.DiscardCard]: game => currentPlayer(game).hand.length === 11,
  [MoveType.PickCard]: game => currentPlayer(game).hand.length === 10,
  [MoveType.DrawCard]: game => currentPlayer(game).hand.length === 10,
  [MoveType.Knock]: game => Melds.findMinimalDeadwood(currentPlayer(game).hand).deadwoodValue <= 10,
  [MoveType.Gin]: game => Melds.findMinimalDeadwood(currentPlayer(game).hand).deadwood.length <= 1,
  [MoveType.BigGin]: game =>
    currentPlayer(game).hand.length === 11 && Melds.findMinimalDeadwood(currentPlayer(game).hand).deadwood.length === 0,
}

const validateMove = (move: Move): GameAction => game =>
  moveRules[move.moveType](game) ? actionOf(game) : gameErrorOf(GameErrorType.InvalidMove)

const drawCard: GameAction = game =>
  actionOf({
    ...game,
    discardPile: [...game.discardPile, game.deck.cards[0]],
    deck: {
      ...game.deck,
      cards: game.deck.cards.slice(1),
    },
  })

const moveToNextPlayer: GameAction = game =>
  actionOf({
    ...game,
    currentPlayerIndex: (game.currentPlayerIndex + 1) % game.playersCount,
    moveCounter: game.moveCounter + 1,
  })

const drawCardToPlayer: GameAction = game => {
  const d = Decks.drawCards(game.deck, 1)
  return actionOf({
    ...game,
    deck: d.deck,
    players: replaceCurrentPlayer(game, p => Players.addCards(p, d.cards)),
  })
}

const pickCardToPlayer: GameAction = game => {
  return actionOf({
    ...game,
    discardPile: game.discardPile.slice(1),
    players: replaceCurrentPlayer(game, p => Players.addCards(p, [game.discardPile[0]])),
  })
}

const discardCardFromPlayer = (cardToDiscard: Card): GameAction => game => {
  return actionOf({
    ...game,
    discardPile: [cardToDiscard, ...game.discardPile],
    players: replaceCurrentPlayer(game, p => Players.removeCard(p, cardToDiscard)),
  })
}

const startPlaying: GameAction = game => {
  return actionOf({
    ...game,
    stage: GameStage.Playing,
  })
}

const endGame: GameAction = game => {
  return actionOf({
    ...game,
    stage: GameStage.Ended,
  })
}

const checkBigGin: GameAction = game =>
  currentPlayer(game).hand.length === 11 && Melds.findMinimalDeadwood(currentPlayer(game).hand).deadwood.length === 0
    ? endGame(game)
    : actionOf(game)

export const start: GameAction = game =>
  act(game)(
    startPlaying,
    distributeCards,
    drawCard,
    addEvents(...toAllPlayers(game)(PlayerEventType.GameStarted), toCurrentPlayer(game)(PlayerEventType.PlayStage1)),
  )

const moveActions: MoveActions = {
  [MoveType.Pass]: [moveToNextPlayer],
  [MoveType.PickCard]: [pickCardToPlayer, addEventsToCurrentPlayer(PlayerEventType.PlayStage2)],
  [MoveType.DrawCard]: [drawCardToPlayer, addEventsToCurrentPlayer(PlayerEventType.PlayStage2)],
  [MoveType.Knock]: [endGame],
  [MoveType.Gin]: [endGame],
  [MoveType.BigGin]: [endGame],
}

export const doMove = (move: Move): GameAction => game =>
  move.moveType === MoveType.DiscardCard
    ? act(game)(discardCardFromPlayer((move as any).card), moveToNextPlayer)
    : act(game)(...moveActions[move.moveType])

export const play = (playerId: PlayerId, move: Move): GameAction => game =>
  act(game)(validatePlayer(playerId), validateMove(move), doMove(move), checkBigGin)
