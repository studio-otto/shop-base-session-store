export default class GraphSql {
  construct() {}

  replaceAll(string, find, replace) {
    return string.replace(
      new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
      replace
    )
  }

  productsFromHandlesQuery(handles) {
    return `{
			${handles.map((handle) => this.productByHandle(handle)).join('')}
		}`
  }

  collectionQuery(collectionHandle, limit, cursor) {
    const collectionInfo = cursor ? '' : this.collectionFields()
    return `{ collectionByHandle(handle: "${collectionHandle}") {
					${collectionInfo}
          products(first:${limit}${
      cursor ? `, after: "${cursor}"` : ''
    }, sortKey: MANUAL) {
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
    `
  }

  collectionFields() {
    return `
      title
      description
      image {
				src
			}
    `
  }

  searchProductsQuery(queryString, cursor) {
    return `
			{
				products(query: "${queryString}", first: 30 ${
      cursor ? `, after: "${cursor}"` : ''
    }) {
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
		`
  }

  queryProduct(handle) {
    return `{product: productByHandle(handle: "${handle}") {
			${this._productFragment()}
		}}`
  }

  productByHandle(handle) {
    return `
			${this.uniqHandle(handle)}: productByHandle(handle: "${handle}") {
				${this._productFragment()}
			}
		`
  }

  uniqHandle(handle) {
    return `${handle.replace(/-|[0-9]/g, '')}_${Math.random()
      .toString()
      .substring(7)}`
  }

  // Not a true graphql fragment because that wasn't working for me but can be used as one with string interpolation
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

			metafields(identifiers:
				[
					{ namespace: "pdp_extras", key: "pdp_swatch_name" },
					{ namespace: "pdp_extras", key: "pdp_swatch_products" },
					{ namespace: "pdp_extras", key: "pdp_swatch_hex" },
					{ namespace: "pdp_extras", key: "pdp_field_details" },
					{ namespace: "pdp_extras", key: "pdp_similar_products" }
				]
			){
				key
				value
			}

			media(first: 5) {
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

			variants(first: 40) {
				pageInfo {
					hasNextPage
					hasPreviousPage
				}
				edges {
					node {
						id
						availableForSale
						compareAtPrice {
							amount
						}
						price {
							amount
						}
						title
            image {
              src
            }
						selectedOptions {
							value,
							name

						}
            swatch_color: metafield(
              namespace: "pdp_extras"
              key: "swatch_color"
            ) {
                value
            }
					}
				}
			}
		`
  }
}
