import { pipe } from "fp-ts/lib/pipeable"
import * as R from "ramda"
import { buildEnvironment } from "../Environment/domain"
import { Environment } from "../Environment/model"
import * as MCTS from "../monte-carlo-tree-search/mcts"
import * as Games from "../Game/domain"
import * as Cards from "../Cards/domain"
import * as Players from "../Players/domain"
import * as Decks from "../Deck/domain"
import { Game, GameStage } from "../Game/model"
import { Player } from "../Players/model"
import { findMinimalDeadwood } from "../Game/melds"
import { Move } from "../Moves/model"
import { fold } from "fp-ts/lib/Either"

export enum PlayerTypes {
  Human = "Human",
  Random = "Random",
  MCTS = "MCTS",
}

const defaultOptions = {
  timeLimitMs: 500,
}

const environment: Environment = buildEnvironment({})

const calcScore = (player: Player) => {
  const { deadwoodValue } = findMinimalDeadwood(player.hand)
  return (100 - deadwoodValue) / 100
}

const calcScores = (game: Game) => game.players.map(calcScore)

const isFinal = (game: Game) => game.stage === GameStage.Ended

const nextState = (game: Game, move: Move) =>
  pipe(
    Games.run(environment)(game)(Games.play(Games.currentPlayer(game).id, move)),
    fold(_ => game, R.identity),
  )

const gameRules: MCTS.GameRules<Game, Move> = {
  availableMoves: Games.validMoves,
  currentPlayerIndex: state => state.currentPlayerIndex,
  isFinal,
  nextState,
  playersCount: state => state.playersCount,
}

const config: MCTS.Config<Game, Move> = {
  calcScores,
  calcUct: MCTS.defaultUctFormula(),
  gameRules,
}

const simulateGame = (game: Game, player: Player, options: MCTS.Options) => {
  const knownCards = [...game.discardPile, ...player.hand]
  const deckCards = Decks.create().cards.filter(Cards.notIn(knownCards))
  const otherPlayers = R.range(0, game.playersCount - 1).map(
    i => Players.create(`p${i + 2}`, `Player ${i + 2}`),
    PlayerTypes.MCTS,
  )
  const distributed = Decks.distributeCards(deckCards, otherPlayers)
  const players = [player, ...distributed.players]
  const deck = Decks.fromCards(distributed.cards)

  const newGame = {
    ...game,
    events: [],
    deck,
    players,
  }

  // const notifier = (notification: MCTS.Notification) => console.log(JSON.stringify(R.omit(["node", "state"], notification), null, 2))
  const tree = MCTS.createTree(config)(newGame, newGame.currentPlayerIndex)

  const { bestNode } = MCTS.findBestNode(tree, options)

  return bestNode.move as Move
}

export const findBestMove = (game: Game, player: Player, options: MCTS.Options = defaultOptions): Move => {
  const moves = Games.validMovesForPlayer(player)(game)

  const bm = moves.length === 1 ? moves[0] : simulateGame(game, player, options)

  console.log("BEST MOVE=====>\n", JSON.stringify(bm, null, 2))

  return bm
}
