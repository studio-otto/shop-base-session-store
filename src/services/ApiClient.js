import axios from 'axios'
import GraphSql from '@/services/GraphSQL'

export default class ApiClient {
  constructor({shopifyDomain, shopifyToken}) {
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
    }
    return axios(options)
  }

  fetchCollection(collectionHandle, cursor, limit =  50, page = 1) {
    const query = this.graphSql.collectionQuery(collectionHandle, limit, cursor);
    return this.fetch(query).then((response) => {
      // nested data response from graphQl
      const responseData = response.data.data.collectionByHandle
      // product and page data comes nested in graphql edges and nodes
      if(!responseData) return

      const productsData = this._normalizeGraphqlResponse(responseData.products)

      return {
        ...responseData,
        products: productsData.content
                    .map((product,index) => this._normalizeGraphqlProduct(product, index + page*limit))
                    .filter(this.filterAvailableAndStocked),
        nextPage: productsData.cursor,
      }
    }).catch((response) => {
      console.log(`fetchCollection error: ${response}`);
    })
  }

  filterAvailableAndStocked(product) {
    return (
      product.variants.some((variant) => variant.available) ||
      product.tags.includes('restocking')
    )
  }

  fetchProduct(handle) {
    let query = this.graphSql.queryProduct(handle);
    return this.fetch(query).then((responseSuccess) => {
      return this._normalizeGraphqlProduct(responseSuccess.data.data.product)
    });
  }

  fetchProductsFromHandles(handles) {
    if (handles && handles.length > 0) {
      const query = this.graphSql.productsFromHandlesQuery(handles);
      return this.fetch(query).then((responseSuccess) => {
        const products = responseSuccess.data.data;
        // Since graphql cant have dasherized keys, we have to underscore them and convert them back here
        return products 
            ? Object.values(products).map((product) => product ? this._normalizeGraphqlProduct(product) : 'Stale')
            : []
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
      content: response.edges.map((edge) => edge.node )
    }
  }

  _normalizeGraphqlProduct(product, manualSortWeight) {
    return {
      ...product,
      manualSortWeight,
      images: this._normalizeGraphqlResponse(product.images).content,
      metafields: this._mapMetafieldsArrayToObj(this._normalizeGraphqlResponse(product.metafields).content),
      variants: this._normalizeGraphqlResponse(product.variants).content 
    }
  }

  _mapMetafieldsArrayToObj(metafields) {
    return metafields.reduce((metaObj, metafield) => {
      metaObj[metafield.key] = metafield.value;
      return metaObj;
    }, {})
  }
}
