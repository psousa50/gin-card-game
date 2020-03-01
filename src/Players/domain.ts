import { Hand } from "../Cards/model"
import { Player, PlayerId, PlayerPublicState } from "./model"

export const create = (id: PlayerId, name: string, type = "", hand: Hand = []): Player => ({
  hand,
  id,
  name,
  type,
})

export const createFromPublicState = (playerPublicState: PlayerPublicState): Player => ({
  ...playerPublicState,
})
