'use strict';Object.defineProperty(exports,'__esModule',{value:true});var Vue=require('vue'),ShopifyBuyClient=require('shopify-buy'),axios=require('axios'),Vuex=require('vuex');function _interopDefaultLegacy(e){return e&&typeof e==='object'&&'default'in e?e:{'default':e}}var Vue__default=/*#__PURE__*/_interopDefaultLegacy(Vue);var ShopifyBuyClient__default=/*#__PURE__*/_interopDefaultLegacy(ShopifyBuyClient);var axios__default=/*#__PURE__*/_interopDefaultLegacy(axios);var Vuex__default=/*#__PURE__*/_interopDefaultLegacy(Vuex);const state = {
  cartIsBusy: true,
  checkout: null,
  itemCount: 0,
  drawerIsOpen: false
}; // getters

const getters = {
  client(state, getters, rootState) {
    return ShopifyBuyClient__default['default'].buildClient({
      domain: rootState.domain,
      storefrontAccessToken: rootState.token
    });
  }

}; // actions

const actions = {
  // ----------------
  // CHECKOUT CREATION/RETRIEVAL METHODS
  // ----------------
  async getCheckout({
    commit,
    dispatch,
    getters
  }, checkoutId = null) {
    commit("setCartIsBusy", true);
    const id = checkoutId ? checkoutId : localStorage.getItem('currentCheckout');
    const checkout = id && id !== "undefined" ? await getters.client.checkout.fetch(id) : await dispatch('createCheckout');
    commit('setCheckout', checkout);
    commit("setCartIsBusy", false);
  },

  async createCheckout({
    commit,
    getters
  }) {
    const checkout = await getters.client.checkout.create();
    commit('setCheckout', checkout);
    return checkout;
  },

  // --------------------------
  // CHECKOUT LINE ITEM METHODS
  // --------------------------
  // addLineItemToCheckout: Add a new Line Item to the checkout
  async addLineItemToCheckout({
    commit,
    dispatch,
    state,
    getters
  }, {
    lineItem,
    quantity = 1,
    noteObj = null,
    checkoutObj = null
  }) {
    commit('setCartIsBusy', true);

    if (!state.checkout) {
      await dispatch('createCheckout');
    }

    const lineItemNote = noteObj ? noteObj : {
      key: '',
      value: ''
    };
    const checkoutNote = checkoutObj ? checkoutObj : {
      customAttributes: [{
        key: '',
        value: ''
      }]
    };
    const encodedVariantId = lineItem.id && lineItem.id.length > 15 ? lineItem.id : btoa(`gid://shopify/ProductVariant/${lineItem.id}`);
    await getters.client.checkout.updateAttributes(state.checkout.id, checkoutNote);
    const newCheckout = await getters.client.checkout.addLineItems(state.checkout.id, {
      variantId: encodedVariantId,
      quantity,
      customAttributes: [lineItemNote]
    });
    commit('setCheckout', newCheckout);
    commit('setCartIsBusy', false); // dispatch('autoOpenDrawer');
  },

  // UpdateLineItems: modifies line items (array) in the checkout
  // params: lineItmes = [{id: "graphqlId", quantity: 2}, etc]
  async updateLineItems({
    commit,
    state,
    getters
  }, lineItems) {
    commit('setCartIsBusy', true);
    const newCheckout = await getters.client.checkout.updateLineItems(state.checkout.id, lineItems);
    commit('setCheckout', newCheckout);
    commit('setCartIsBusy', false);
  },

  // updateAttributes: modifies attributes on the checkout object
  // params: lineItmes = [{id: "graphqlId", quantity: 2}, etc]
  async updateAttributes({
    commit,
    state,
    getters
  }, checkoutNote) {
    commit('setCartIsBusy', true);
    const newCheckout = await getters.client.checkout.updateAttributes(state.checkout.id, checkoutNote);
    commit('setCheckout', newCheckout);
    commit('setCartIsBusy', false);
  },

  // UpdateLineItem: modify the quantity of (one line item) line item in checkout
  async updateLineItem({
    dispatch
  }, {
    lineItemId,
    quantity
  }) {
    dispatch('updateLineItems', [{
      id: lineItemId,
      quantity
    }]);
  },

  // removeLineItem: Remove a lineitem via id
  async removeLineItem({
    state,
    commit,
    getters
  }, lineItemId) {
    commit('setCartIsBusy', true);
    const newCheckout = await getters.client.checkout.removeLineItems(state.checkout.id, [lineItemId]);
    commit('setCheckout', newCheckout);
    commit('setCartIsBusy', false);
  },

  async autoOpenDrawer({
    commit,
    dispatch,
    state
  }) {
    if (state.drawerIsOpen) return;
    commit('setDrawerState', true);
    await dispatch("resolveAfter3Seconds");
    commit('setDrawerState', false);
  },

  async resolveAfter3Seconds() {
    return new Promise(resolve => {
      window.setTimeout(() => {
        resolve('resolved');
      }, 3000);
    });
  }

}; // mutations

const mutations = {
  setCheckout(state, checkout) {
    localStorage.setItem('currentCheckout', checkout.id);
    Vue__default['default'].set(state, 'checkout', checkout);
    state.itemCount = checkout && checkout.lineItems ? checkout.lineItems.reduce((count, lineItem) => {
      return lineItem.quantity + count;
    }, 0) : 0;
  },

  toggleDrawer(state) {
    state.drawerIsOpen = !state.drawerIsOpen;
  },

  setDrawerState(state, drawerState) {
    state.drawerIsOpen = drawerState;
  },

  setCartIsBusy(state, cartIsBusy) {
    state.cartIsBusy = cartIsBusy;
  }

};
var cart = {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};class GraphSql {
  construct() {}

  replaceAll(string, find, replace) {
    return string.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "g"), replace);
  }

  productsFromHandlesQuery(handles) {
    return `{
			${handles.map(handle => this.productByHandle(handle)).join("")}
		}`;
  }

  collectionQuery(collectionHandle, limit, cursor) {
    const collectionInfo = cursor ? '' : this.collectionFields();
    return `{ collectionByHandle(handle: "${collectionHandle}") {
					${collectionInfo}
          products(first:${limit}${cursor ? `, after: "${cursor}"` : ''}, sortKey: MANUAL) {						
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
            edges {
              cursor
              node {
                handle
              }
            }
          }
        }
      }
    `;
  }

  collectionFields() {
    return `
      title
      description
      image {
				src
			}
    `;
  }

  searchProductsQuery(queryString, cursor) {
    return `
			{
				products(query: "${queryString}", first: 30 ${cursor ? `, after: "${cursor}"` : ""}) {
					pageInfo {
						hasNextPage,
						hasPreviousPage
					}
					edges {
						cursor
						node {
							${this._productFragment()}
						}
					}
				}
			}
		`;
  }

  queryProduct(handle) {
    return `{product: productByHandle(handle: "${handle}") {
			${this._productFragment()}
		}}`;
  }

  productByHandle(handle) {
    return `
			${this.uniqHandle(handle)}: productByHandle(handle: "${handle}") {
				${this._productFragment()}
			}
		`;
  }

  uniqHandle(handle) {
    return `${handle.replace(/-|[0-9]/g, "")}_${Math.random().toString().substring(7)}`;
  } // Not a true graphql fragment because that wasn't working for me but can be used as one with string interpolation


  _productFragment() {
    return `
			availableForSale
			title
			handle
			tags
			description
			descriptionHtml
			productType
			id
	
			images(first: 10) {
				pageInfo {
					hasNextPage
					hasPreviousPage
				}
				edges {
					node {
						src
					}
				}
			}
	
			metafields(first: 50, namespace: "pdp_extras") {
				edges {
					node {
						key
						value
					}
				}
			}

			media(first: 1) {
				edges{
					node {
						alt
						mediaContentType
						... on Video {
              id
              sources {
                format
                height
                mimeType
                url
                width
              }
            }
					}
				}
			}
	
			variants(first: 20) {
				pageInfo {
					hasNextPage
					hasPreviousPage
				}
				edges {
					node {
						id
						available
						compareAtPrice
						price
						title
						selectedOptions {
							value
						}
					}
				}
			}
		`;
  }

}class ApiClient {
  constructor({
    shopifyDomain,
    shopifyToken
  }) {
    this.shopifyDomain = shopifyDomain;
    this.shopifyToken = shopifyToken;
    this.graphSql = new GraphSql();
  }

  fetch(gsqlData) {
    const options = {
      method: 'POST',
      headers: {
        'content-type': 'application/graphql',
        'X-Shopify-Storefront-Access-Token': this.shopifyToken
      },
      url: `https://${this.shopifyDomain}/api/2020-01/graphql.json`,
      data: gsqlData
    };
    return axios__default['default'](options);
  }

  fetchCollection(collectionHandle, cursor, limit = 50, page = 1) {
    const query = this.graphSql.collectionQuery(collectionHandle, limit, cursor);
    return this.fetch(query).then(response => {
      // nested data response from graphQl
      const responseData = response.data.data.collectionByHandle; // product and page data comes nested in graphql edges and nodes

      if (!responseData) return;

      const productsData = this._normalizeGraphqlResponse(responseData.products);

      return { ...responseData,
        products: productsData.content.map(product => product.handle),
        nextPage: productsData.cursor
      };
    }).catch(response => {
      console.log(`fetchCollection error: ${response}`);
    });
  }

  filterAvailableAndStocked(product) {
    return product.variants.some(variant => variant.available) || product.tags.includes('restocking');
  }

  fetchProduct(handle) {
    let query = this.graphSql.queryProduct(handle);
    return this.fetch(query).then(responseSuccess => {
      return this._normalizeGraphqlProduct(responseSuccess.data.data.product);
    });
  }

  fetchProductsFromHandles(handles) {
    if (handles && handles.length > 0) {
      const query = this.graphSql.productsFromHandlesQuery(handles);
      return this.fetch(query).then(responseSuccess => {
        const products = responseSuccess.data.data; // Since graphql cant have dasherized keys, we have to underscore them and convert them back here

        return products ? Object.values(products).map(product => product ? this._normalizeGraphqlProduct(product) : 'Stale') : [];
      });
    } else {
      return [];
    }
  }

  _normalizeGraphqlResponse(response) {
    const hasNextPage = response.hasOwnProperty('pageInfo') ? response.pageInfo.hasNextPage : false;
    return {
      hasNextPage,
      cursor: hasNextPage ? response.edges[response.edges.length - 1].cursor : "",
      content: response.edges.map(edge => edge.node)
    };
  }

  _normalizeGraphqlProduct(product, manualSortWeight) {
    return { ...product,
      manualSortWeight,
      images: this._normalizeGraphqlResponse(product.images).content,
      metafields: this._mapMetafieldsArrayToObj(this._normalizeGraphqlResponse(product.metafields).content),
      variants: this._normalizeGraphqlResponse(product.variants).content,
      media: this._normalizeGraphqlResponse(product.media)
    };
  }

  _mapMetafieldsArrayToObj(metafields) {
    return metafields.reduce((metaObj, metafield) => {
      metaObj[metafield.key] = metafield.value;
      return metaObj;
    }, {});
  }

}const state$1 = {
  collections: {},
  allProducts: {},
  isLoading: false,
  loadedCollections: []
};
const getters$1 = {
  apiClient(state, getters, rootState) {
    return new ApiClient({
      shopifyDomain: rootState.domain,
      shopifyToken: rootState.token
    });
  }

}; // actions

const actions$1 = {
  async getCollection({
    state,
    dispatch
  }, handle) {
    if (!state.collections[handle] || !state.collections[handle].products) {
      await dispatch('getCollectionProducts', handle);
    }
  },

  async getCollectionProducts({
    dispatch,
    commit
  }, handle) {
    commit('setIsLoading', true);
    await dispatch('getCollectionProductPage', {
      handle,
      cursor: null,
      page: 1
    });
    commit('setIsLoading', false);
    commit('markCollectionAsFullyLoaded', handle);
  },

  async getCollectionProductPage({
    dispatch,
    commit,
    getters
  }, {
    handle,
    cursor,
    page
  }) {
    const collectionResponse = await getters.apiClient.fetchCollection(handle, cursor, cursor ? 250 : 50, page);

    if (collectionResponse) {
      commit('pushToProducts', collectionResponse.products);
      commit('updateCollection', {
        handle,
        collectionResponse
      });

      if (collectionResponse.nextPage) {
        await dispatch('getCollectionProductPage', {
          handle,
          cursor: collectionResponse.nextPage,
          page: page + 1
        });
      }
    } else {
      console.log(`Collection not found for handle: ${handle}`);
    }
  },

  async getProduct({
    state,
    dispatch,
    commit,
    getters
  }, handle) {
    // Check if its loaded in memory before making request
    let targetProduct = state.allProducts[handle];

    if (!targetProduct || targetProduct && !targetProduct.meta) {
      commit('setIsLoading', true);
      commit('updateProductsLoadingState', {
        handle,
        loadingState: {
          isLoaded: false,
          isLoading: true
        }
      });
      targetProduct = await getters.apiClient.fetchProduct(handle);
      commit('pushToProducts', [targetProduct]);
      commit('setIsLoading', false);
    }

    if (targetProduct.metafields) {
      const swatchProducts = targetProduct.metafields.pdp_swatch_products ? targetProduct.metafields.pdp_swatch_products.split(',') : [];
      const similarProducts = targetProduct.metafields.pdp_similar_products ? targetProduct.metafields.pdp_similar_products.split(',') : [];
      dispatch('getProductsByHandle', [...swatchProducts, ...similarProducts]);
    }
  },

  async getProductsByHandle({
    state,
    commit,
    getters
  }, handlesArray = []) {
    const unloadedProductHandles = handlesArray.filter(handle => !state.allProducts[handle]);
    const loadedProducts = await getters.apiClient.fetchProductsFromHandles(unloadedProductHandles);
    commit('pushToProducts', loadedProducts);
  }

}; // mutations

const mutations$1 = {
  setIsLoading(state, isLoading) {
    state.isLoading = isLoading;
  },

  markCollectionAsFullyLoaded(state, handle) {
    state.loadedCollections = [...state.loadedCollections, handle];
  },

  updateCollection(state, {
    handle,
    collectionResponse
  }) {
    const collection = state.collections[handle];
    const newCollection = collection ? collection : collectionResponse;

    if (collection && state.collections[handle].products && collectionResponse.products) {
      newCollection.products = [...collection.products, ...collectionResponse.products];
    }

    Vue__default['default'].set(state.collections, handle, newCollection);
  },

  pushToProducts(state, products) {
    products.forEach(product => {
      if (product === 'Stale') return;
      const isOnlyHandle = typeof product === "string";
      const handle = isOnlyHandle ? product : product.handle;
      const newProductAttributes = isOnlyHandle ? {
        handle
      } : product;
      const productAttrs = { ...newProductAttributes,
        isLoading: false,
        isLoaded: !isOnlyHandle
      };
      Vue__default['default'].set(state.allProducts, handle, productAttrs);
    });
  },

  updateProductsLoadingState(state, {
    handle,
    loadingState
  }) {
    // loading state must include isLoading: boolean, isLoaded: boolean
    Vue__default['default'].set(state.allProducts, handle, { ...state.allProducts[handle],
      ...loadingState
    });
  }

};
var products = {
  namespaced: true,
  state: state$1,
  getters: getters$1,
  actions: actions$1,
  mutations: mutations$1
};const Modules = {
  cart,
  products
};const CreateStore = (domain, token) => {
  return new Vuex__default['default'].store({
    getters: {
      domain,
      token // storefront api access token

    },
    modules: Modules,
    strict: "production" !== 'production'
  });
};exports.CreateStore=CreateStore;exports.Modules=Modules;