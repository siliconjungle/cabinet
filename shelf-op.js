const OPERATIONS = {
  SET: 'set',
}

const isObj = data =>
  data && typeof data === 'object' && !Array.isArray(data)

const deepCopy = (data) => JSON.parse(JSON.stringify(data))

// Objects are the only things which need to be an array
// How do I know if it's an object or an actual array?
const deepCopyReplaceValues = (data, replacement) => {
  return (
    isObj(data) ? [
      Object.entries(data).reduce((p, [k, v]) => {
        return ({
          ...p,
          [k]: isObj(v) ? [deepCopyReplaceValues(v, replacement), replacement] : replacement,
        })
      }, {}), replacement
    ] :
    replacement
  )
}

const getDeepValueByKey = (data, key) => {
  if (key.length === 0) {
    return data
  }
  let layer = data
  key.forEach((k) => {
    layer = layer[k]
  })
  return layer
}

// If you want to get the version of something that isn't a leaf... what then?
// Currently this is giving all the children, not just that specific one
const getDeepVersionByKey = (data, key) => {
  if (key.length === 0) {
    return data
  }
  let layer = data
  key.forEach((k) => {
    // Second value is the version, first is the object.
    layer = Array.isArray(layer) ? layer[0][k]: layer[k]
  })
  return Array.isArray(layer) ? layer[1] : layer
}

const setDeepValueByKey = (data, key, value) => {
  if (key.length === 0) {
    return value
  }
  let layer = data
  for (let i = 0; i < key.length - 1; i++) {
    layer = layer[key[i]]
  }
  layer[key[key.length - 1]] = value
  return data
}

const setDeepVersionByKey = (data, key, version) => {
  if (key.length === 0) {
    return version
  }
  let layer = data
  for (let i = 0; i < key.length - 1; i++) {
    layer = Array.isArray(layer) ? layer[0][i] : layer[i]
  }

  if (Array.isArray(layer)) {
    layer[0][key[key.length - 1]] = version
  } else {
    layer[key[key.length - 1]] = version
  }

  return data
}

export const SHELF_TYPE_RANKINGS = {
  'object': 0,
  'array': 1,
  'string': 2,
  'number': 3,
  'boolean': 4,
  'null': 5,
  'other': 6,
}

export const getShelfTypeRanking = (value) => {
  if (value === null) return SHELF_TYPE_RANKINGS.null
  if (Array.isArray(value)) return SHELF_TYPE_RANKINGS.array
  return SHELF_TYPE_RANKINGS[typeof value] ?? SHELF_TYPE_RANKINGS.other
}

export const compareShelfValues = (value, value2) => {
  const ranking = getShelfTypeRanking(value)
  const ranking2 = getShelfTypeRanking(value2)

  if (ranking < ranking2) return 1
  if (ranking > ranking2) return -1
  if (ranking === SHELF_TYPE_RANKINGS.object) return 0
  // This will be replaced when a better implementation of arrays is added.
  if (ranking === SHELF_TYPE_RANKINGS.array || ranking === SHELF_TYPE_RANKINGS.other) {
    const jsonValue = JSON.stringify(value)
    const jsonValue2 = JSON.stringify(value2)
    if (jsonValue === jsonValue2) {
      return 0
    }
    return jsonValue < jsonValue2 ? 1 : -1
  }
  if (value === value2) {
    return 0
  }
  return value < value2 ? 1 : -1
}

const applySetOp = (shelf, setOp) => {
  shelf.versions = setDeepVersionByKey(shelf.versions, setOp.key, setOp.version)
  shelf.value = setDeepValueByKey(shelf.value, setOp.key, setOp.value)
}

const shouldApplySetOp = (shelf, setOp) => {
  const shelfVersion = getDeepVersionByKey(shelf.versions, setOp.key)
  if (shelfVersion < setOp.version) {
    return true
  } else if (shelfVersion === setOp.version) {
    const shelfValue = getDeepValueByKey(shelf.value, setOp.key)
    const shelfOrder = compareShelfValues(shelfValue, setOp.value)
    if (shelfOrder === 1) {
      return true
    }
  }

  return false
}

export const createOp = {
  set: (key, value, version) => ({ key, type: OPERATIONS.SET, value, version }),
}

export const createShelf = (value) => {
  return {
    value: JSON.parse(JSON.stringify(value)),
    versions: deepCopyReplaceValues(value, 0),
    history: [],
  }
}

// Maybe I should mutate the state *shrugs*
export const applyOp = (shelf, op) => {
  const shelfCopy = deepCopy(shelf)
  shelfCopy.history.push(op)

  if (op.type === OPERATIONS.SET) {
    if (shouldApplySetOp(shelfCopy, op)) {
      applySetOp(shelfCopy, op)
    }
  }

  return shelfCopy
}

export const applyOps = (shelf, ops) => {
  let currentShelf = shelf
  ops.forEach(op => {
    currentShelf = applyOp(currentShelf, op)
  })
  return currentShelf
}

export const getLocalChanges = (data, data2, versions, key = [], ops = []) => {
  if (!data || !(isObj(data) && isObj(data2))) {
    ops.push(
      createOp.set(
        key,
        data2,
        getDeepVersionByKey(versions, key) + 1
      )
    )
    return ops
  }

  const keys = [
    ...new Set(
      [
        ...Object.keys(data),
        ...Object.keys(data2),
      ]
    )
  ]

  keys.forEach(k => {
    getLocalChanges(data[k] ?? null, data2[k] ?? null, versions, [...key, k], ops)
  })

  return ops
}

const shelf = createShelf('hello')
const shelf2 = createShelf(10)
const shelf3 = createShelf({
  name: 'James',
  age: 29,
})

console.log('_SHELF_', shelf)
console.log('_SHELF2_', shelf2)
console.log('_SHELF3_', shelf3)

const setOp2 = createOp.set([], 15, 1)
const shelf2Modified = applyOp(shelf2, setOp2)
console.log('_SHELF_2_MODIFIED_', shelf2Modified)

const setOp3 = createOp.set(['age'], 12, 1)
const shelf3Modified = applyOp(shelf3, setOp3)
console.log('_SHELF_3_MODIFIED_', shelf3Modified)

const shelfData = {
  name: 'Jim jim',
  age: 52,
}

const localChangeOps = getLocalChanges(shelf3.value, shelfData, shelf3.versions)
console.log('_LOCAL_CHANGES_OPS_', localChangeOps)

console.log('_APPLIED_OPS_', applyOps(shelf3, localChangeOps))

const shelf4 = createShelf(['hello', 'world'])
console.log('_SHELF_4_', shelf4)
const setOp4 = createOp.set([], ['world'], 1)
console.log('_SET_OP_4_', setOp4)
const shelf4Modified = applyOp(shelf4, setOp4)
console.log('_SHELF_4_MODIFIED_', shelf4Modified)
