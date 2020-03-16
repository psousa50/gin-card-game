import * as Cards from "./Cards/domain"
import * as Games from "./Game/domain"
import * as Players from "./Players/domain"
import * as Decks from "./Deck/domain"
import { GameStage, Game } from "./Game/model"
import { GameAction, actionOf, getEitherRight } from "./utils/actions"
import { PlayerEvent, PlayerEventType } from "./Events/model"
import { randomElement } from "./utils/misc"
import { Notifier } from "./Environment/model"
import { buildEnvironment } from "./Environment/domain"
import { sort } from "ramda"
import { toSymbols } from "./Cards/domain"
import { findMinimalDeadwood } from "./Game/melds"

const p1 = Players.create("p1", "Player 1")
const p2 = Players.create("p2", "Player 2")
const players = [p1, p2]
const deck = Decks.shuffle(Decks.create())

const getActions = (game: Game, events: PlayerEvent[]) =>
  events
    .filter(e => e.type === PlayerEventType.PlayStage1 || e.type === PlayerEventType.PlayStage2)
    .map(_ => Games.play(Games.currentPlayer(game).id, randomElement(Games.validMoves(game))!))

const processEvents: GameAction = game => Games.act(game)(Games.extractEvents, ...getActions(game, game.events))

export const notify: Notifier = (type, data) => game => {
  const d = {
    type,
    data,
    game: {
      ...game,
      deck: toSymbols(game.deck.cards),
      players: game.players.map(p => ({
        ...p,
        hand: toSymbols(sort(Cards.orderByFaceValue, p.hand)),
      })),
    },
  }
  console.log(JSON.stringify(d, null, 2))
  return actionOf(game)
}

const loop: GameAction = game =>
  game.stage === GameStage.Playing ? Games.act(game)(processEvents, loop) : actionOf(game)

const env = buildEnvironment()

const game = getEitherRight(Games.run(env)(Games.create(players, deck))(Games.start, loop))

console.log(JSON.stringify(game, null, 2))

const m1 = findMinimalDeadwood(game.players[0].hand)
const m2 = findMinimalDeadwood(game.players[1].hand)

console.log(JSON.stringify({
  ...m1,
  deadwood: toSymbols(m1.deadwood)
}))

console.log(JSON.stringify({
  ...m2,
  deadwood: toSymbols(m2.deadwood)
}))
