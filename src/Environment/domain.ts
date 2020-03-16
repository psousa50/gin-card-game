import * as R from "ramda"
import { DeepPartial } from "../utils/types"
import { Environment } from "./model"
import { actionOf } from "../utils/actions"

const defaultEnvironment: Environment = {
  config: {
    auto: true,
  },
  notify: () => game => actionOf(game)
}

export const buildEnvironment = (overrides: DeepPartial<Environment> = {}): Environment => {
  return R.mergeDeepRight(defaultEnvironment, overrides)
}
