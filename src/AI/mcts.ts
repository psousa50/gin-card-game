import { buildEnvironment } from "../Environment/domain"
import { Environment, Notifier } from "../Environment/model"
import * as MCTS from "../monte-carlo-tree-search/mcts"
import * as Games from "../Game/domain"
import * as Cards from "../Cards/domain"
import * as Decks from "../Deck/domain"
import { GameStage, Game } from "../Game/model"
import { Player } from "../Players/model"
import { findMinimalDeadwood } from "../Game/melds"
import { Move } from "../Moves/model"
import { Deck } from "../Deck/model"
import { actionOf, getEitherRight } from "../utils/actions"
import { lj, randomElement } from "../utils/misc"

export enum PlayerTypes {
  Human = "Human",
  Random = "Random",
  MCTS = "MCTS",
}

const defaultOptions = {
  timeLimitMs: 2000,
}

export const notify: Notifier = (type, data) => game => {
  const j = {
    type,
    data,
    ...Games.toPrintableJSON(game),
  }
  console.log(JSON.stringify(j, null, 2))
  return actionOf(game)
}

const environment: Environment = buildEnvironment()

const calcScores = (game: Game) => Games.result(game).scores.map(s => s / 31)

const isFinal = (game: Game) => {
  if (game.moveCounter > 500) {
    lj("GAME FINAL", Games.toPrintableJSON(game))
  }
  return game.stage === GameStage.Ended || game.moveCounter > 500
}

const nextMove = (game: Game) => {
  const moves = Games.validMoves(game)
  // lj("MOVES", moves)
  const playerId = Games.currentPlayer(game).id
  const deadwoods = moves.map(move => {
    const nextGame = getEitherRight(Games.run()(game)(Games.play(playerId, move)))
    const melds = findMinimalDeadwood(Games.getPlayer(nextGame, playerId).hand)
    return melds.deadwoodValue
  })
  const minDeadwood = Math.min(...deadwoods)
  const i = deadwoods.findIndex(d => d === minDeadwood)
  // const i = Math.floor(Math.random() * moves.length)
  const move = i >= 0 ? moves[i] : undefined
  // lj("deadwoods", deadwoods)
  return move
}

const nextState = (game: Game, move: Move) =>
  getEitherRight(Games.run(environment)(game)(Games.play(Games.currentPlayer(game).id, move)))

const gameRules: MCTS.GameRules<Game, Move> = {
  availableMoves: Games.validMoves,
  currentPlayerIndex: state => state.currentPlayerIndex,
  isFinal,
  nextMove,
  nextState,
  playersCount: state => state.playersCount,
}

const config: MCTS.Config<Game, Move> = {
  calcScores,
  calcUct: MCTS.defaultUctFormula(),
  gameRules,
}

export const buildGameForSimulation = (shuffle: (deck: Deck) => Deck) => (game: Game, player: Player) => {
  const { minFaceValue, maxFaceValue } = game.deckInfo
  const knownCards = [...game.discardPile, ...player.hand]
  const deckCards = shuffle(Decks.create(minFaceValue, maxFaceValue)).cards.filter(Cards.notIn(knownCards))
  const otherPlayers = game.players.filter(p => p.id !== player.id).map(p => ({ ...p, hand: [] }))
  const distributed = Decks.distributeCards(deckCards, otherPlayers, game.countOfCardsInHand)
  const players = game.players.map(p => (p.id === player.id ? player : distributed.players.find(op => op.id === p.id)!))
  const deck = Decks.fromCards(distributed.cards, minFaceValue, maxFaceValue)

  // console.log("FC=====>\n", Cards.toSymbols(Decks.create(minFaceValue, maxFaceValue).cards))
  // console.log("KNOWN=====>\n", Cards.toSymbols(knownCards))
  // console.log("DC=====>\n", Cards.toSymbols(deckCards))
  // console.log("P0H=====>\n", Cards.toSymbols(players[0].hand))
  // console.log("P1H=====>\n", Cards.toSymbols(players[1].hand))
  // console.log("DECK=====>\n", Cards.toSymbols(distributed.cards))

  const newGame = {
    ...game,
    events: [],
    deck,
    players,
  }

  return newGame
}

export const notifier = (notification: MCTS.Notification) =>
  console.log(
    JSON.stringify(
      {
        ...notification,
        node: {
          ...notification.node,
          state: undefined,
        },
      },
      null,
      2,
    ),
  )

const simulateGame = (currentGame: Game, player: Player, options: MCTS.Options) => {
  const gameForSimulation = buildGameForSimulation(Decks.shuffle)(currentGame, player)
  const tree = MCTS.createTree({ ...config, notifier })(gameForSimulation, gameForSimulation.currentPlayerIndex)

  const result = MCTS.findBestNode(tree, options)
  // console.log("RESULT: ", JSON.stringify(result.iterationCount, null, 2))
  const { bestNode } = result

  return bestNode.move as Move
}

export const findBestMove = (game: Game, player: Player, options: MCTS.Options = defaultOptions): Move => {
  const moves = Games.validMovesForPlayer(player)(game)

  const bestMove = moves.length === 1 ? moves[0] : simulateGame(game, player, options)

  // console.log(JSON.stringify(bestMove, null, 2))

  return bestMove
}
