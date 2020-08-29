import Vuex from 'vuex'
import {Modules} from '@/modules/index'

const CreateStore = (domain, token) => {
  return new Vuex.store({
    getters: {
      domain,
      token // storefront api access token
    },
    modules: Modules,
    strict: process.env.NODE_ENV !== 'production'
  })
}

export { CreateStore }
