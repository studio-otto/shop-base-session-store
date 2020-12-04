import axios from 'axios'

const state = () => ({
  items: {},
  menuHasClosed: false,
  menuIsOpen: false
})

const mutations = {
  setMenu(state, items) {
    state.items = items
  },

  setError(state, error) {
    state.menu = error
  },

  toggleMenu(state) {
    state.menuIsOpen = !state.menuIsOpen
  }
}

const uniqArray = (arr) => [...new Set(arr)];

const addMenuCollectionInfo = (commit, items) => {
  items.forEach((item) => {
    if(item.isCollection) {
      const { products, title, productCount, url } = item
      const handle = url.replace('/collections/', '')
      commit(
        'products/updateCollection',
        {
          handle: handle,
          collectionResponse: {
            products,
            title,
            handle,
            partiallyLoaded: item.products.length < productCount
          } 
        },
        { root: true }
      )
      if(item.products.length >= productCount) commit('products/markCollectionAsFullyLoaded', handle, { root: true })
    }

    if(item.links) {
      addMenuCollectionInfo(commit, item.links)
    }
  })
}

const addMenuProductInfo = (commit, items) => {
  const allNewProducts = uniqArray(items.reduce((handles, item) => {
    const topLevelHandles = typeof item.products === "object" ? item.products : []
    const nestedHandles = item.links ? item.links.reduce((nestedHandles, nestedItem) => {
      return typeof nestedItem.products === "object" ? [...nestedHandles, ...nestedItem.products] : nestedHandles
    }, []) : []

    return [...handles, ...topLevelHandles, ...nestedHandles]
  }, []))

  commit('products/pushToProducts', allNewProducts, { root: true })
}

const actions = {
  async fetchMenu({ commit, rootState }) {
    const menuApi = await axios({
      method: 'GET',
      url: rootState.menuLocation
    })
    const menuItems = menuApi.data && menuApi.data.menu ? menuApi.data.menu : []
    commit('setMenu', menuItems)
    addMenuProductInfo(commit, menuItems)
    addMenuCollectionInfo(commit, menuItems)
  }
}

export default {
  namespaced: true,
  state,
  actions,
  mutations
};
