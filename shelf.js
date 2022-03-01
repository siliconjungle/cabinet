const SHELF_TYPE_RANKINGS = {
  'OBJECT': 0,
  'ARRAY': 1,
  'STRING': 2,
  'NUMBER': 3,
  'BOOLEAN': 4,
  'NULL': 5,
  'OTHER': 6,
}

const getShelfTypeRanking = (value) => {
  if (value === null) return SHELF_TYPE_RANKINGS.NULL
  if (Array.isArray(value)) return SHELF_TYPE_RANKINGS.ARRAY
  return SHELF_TYPE_RANKINGS[typeof value] || SHELF_TYPE_RANKINGS.OTHER
}

export const compareValues = (value, value2) => {
  const ranking = getShelfTypeRanking(value)
  const ranking2 = getShelfTypeRanking(value2)

  if (ranking < ranking2) return 1
  if (ranking > ranking2) return -1
  if (ranking === SHELF_TYPE_RANKINGS.OBJECT) return 0
  // This will be replaced when a better implementation of arrays is added.
  if (ranking === SHELF_TYPE_RANKINGS.ARRAY || ranking === SHELF_TYPE_RANKINGS.OTHER) {
    const jsonValue = JSON.stringify(value)
    const jsonValue2 = JSON.stringify(value2)
    if (jsonValue === jsonValue2) {
      return 0
    }
    return jsonValue < jsonValue2 ? 1 : -1
  }
  if (ranking === ranking2) {
    return 0
  }
  return ranking < ranking2 ? 1 : -1
}

export const compareShelves = (shelf, shelf2) => {
  if (shelf) {
    if (shelf2) {
      if (shelf[1] > shelf2[1]) {
        return 1
      } else if (shelf2[1] > shelf[1]) {
        return -1
      }
      return compareValues(shelf[0], shelf2[0])
    }
    return 1
  }
  if (shelf2) {
    return -1
  }
  return 0
}

const isObj = data =>
  data && typeof data === 'object' && !Array.isArray(data)

export const createShelf = (data, objectVersion = 0) => {
  return (
    [
      isObj(data) ?
        Object.entries(data).reduce((p, [k, v]) => {
          return ({
            ...p,
            [k]: isObj(v) ? createShelf(v) : [v, 0],
          })
        }, {}) :
        data,
      objectVersion,
    ]
  )
}

export const getDataFromShelf = shelf => {
  return isObj(shelf[0]) ? (
    Object.entries(shelf[0]).reduce((p, [k, v]) => {
      if (v[0] === null) {
        return {
          ...p,
        }
      }
      return {
        ...p,
        [k]: isObj(v[0]) ? getDataFromShelf(v) : v[0],
      }
    }, {})
  ) : shelf[0]
}

// This diff creates a shelf that contains the changes which would be applied for a merge.
export const diffShelves = (shelf, shelf2) => {
  // Only return fields that belong to 2
  // Or that belong to 1 and don't belong to 2
  if (!shelf && !shelf2) {
    return null
  }
  const shelfOrder = compareShelves(shelf, shelf2)
  if (shelfOrder === 1) {
    return null
  } else if (shelfOrder === -1) {
    return shelf2
  }

  // Checking if the two objects in their entirety are the same.
  // Could this be delegated to the compare shelves function?
  if (JSON.stringify(shelf[0]) === JSON.stringify(shelf2[0])) {
    return [null, shelf2[1]]
  }

  const keys = [
    ...new Set(
      [
        ...Object.keys(shelf[0]),
        ...Object.keys(shelf2[0])
      ]
    )
  ]
  return [
    keys.reduce((p, key) => {
      const shelfOrder2 = compareShelves(shelf[0][key], shelf2[0][key])
      if (shelfOrder2 === 1 || JSON.stringify(shelf[0][key]) === JSON.stringify(shelf2[0][key])) {
        return {
          ...p,
        }
      }
      return {
        ...p,
        [key]: diffShelves(shelf[0][key] ?? null, shelf2[0][key] ?? null),
      }
    }, {}),
    shelf[1]
  ]
}

export const mergeShelves = (shelf, shelf2) => {
  if (!shelf && !shelf2) {
    return null
  }
  const shelfOrder = compareShelves(shelf, shelf2)
  if (shelfOrder === 1) {
    return shelf
  } else if (shelfOrder === -1) {
    return shelf2
  }

  // Checking if the two objects in their entirety are the same.
  // Could this be delegated to the compare shelves function?
  if (JSON.stringify(shelf[0]) === JSON.stringify(shelf2[0])) {
    return shelf2
  }

  const keys = [
    ...new Set(
      [
        ...Object.keys(shelf[0]),
        ...Object.keys(shelf2[0]),
      ]
    )
  ]
  return [
    keys.reduce((p, key) => {
      return {
        ...p,
        [key]: mergeShelves(shelf[0][key] ?? null, shelf2[0][key] ?? null),
      }
    }, {}),
    shelf[1],
  ]
}

// Apply local changes
// Loop through all keys
// If key belongs to shelf then set data's version to shelf +1
// If it doesn't, set data's version to 0
export const createLocalChangesDiff = (shelf, data) => {
  if (!shelf) {
    return createShelf(data)
  }

  if (!isObj(data)) {
    return shelf[0] === data ? [data, shelf[1]] : [data, shelf[1] + 1]
  }

  if (!isObj(shelf[0])) {
    return createShelf(data, shelf[1] + 1)
  }

  const keys = [
    ...new Set(
      [
        ...Object.keys(shelf[0]),
        ...Object.keys(data),
      ]
    )
  ]

  return [
    keys.reduce((p, key) => {
      return {
        ...p,
        [key]: createLocalChangesDiff(shelf[0][key] ?? null, data[key] ?? null),
      }
    }, {}),
    shelf[1],
  ]
}
