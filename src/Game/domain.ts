import { Player, PlayerId } from "../Players/model"
import * as Events from "../Events/domain"
import { Deck } from "../Deck/model"
import { Environment } from "../Environment/model"
import { GameAction, actionOf, ask, GameResult, actionErrorOf } from "../utils/actions"
import { Game, GameStage, GameErrorType } from "./model"
import { pipe } from "fp-ts/lib/pipeable"
import { chain } from "fp-ts/lib/ReaderEither"
import { buildEnvironment } from "../Environment/domain"
import { PlayerEvent } from "../Events/model"
import { Move } from "../Moves/model"

export const create = (players: Player[], stock: Deck): Game => ({
  currentPlayerIndex: 0,
  discardPile: [],
  events: [],
  moveCounter: 0,
  players,
  playersCount: players.length,
  stage: GameStage.Idle,
  stock,
})

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

const addEvents = (...events: PlayerEvent[]): GameAction => game =>
  actionOf({
    ...game,
    events: [...game.events, ...events],
  })

const drawCard: GameAction = game =>
  actionOf({
    ...game,
    discardPile: [...game.discardPile, game.stock.cards[0]],
    stock: {
      ...game.stock,
      cards: game.stock.cards.slice(1),
    },
  })

const validateMove = (playerId: PlayerId): GameAction => game =>
  currentPlayer(game).id === playerId ? actionOf(game) : gameErrorOf(GameErrorType.InvalidPlayer)

const moveToNextPlayer: GameAction = game =>
  actionOf({
    ...game,
    currentPlayerIndex: (game.currentPlayerIndex + 1) % game.playersCount,
  })

export const start: GameAction = game => {
  const p = currentPlayer(game)
  return act(game)(
    drawCard,
    addEvents(Events.createPlayerEventGameStarted(p, game), Events.createPlayerEventPlay(p, game)),
  )
}

export const doMove: GameAction = drawCard

export const play = (playerId: PlayerId, __: Move): GameAction => game =>
  act(game)(validateMove(playerId), doMove, moveToNextPlayer)
