import * as R from "ramda"
import { DeepPartial } from "../utils/types"
import { Environment } from "./model"

const defaultEnvironment: Environment = {
  config: {
    auto: true,
  },
}

export const buildEnvironment = (overrides: DeepPartial<Environment> = {}): Environment => {
  return R.mergeDeepRight(defaultEnvironment, overrides)
}
