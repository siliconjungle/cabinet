const OPERATIONS = {
  SET: 'set',
  INSERT: 'insert',
  DELETE: 'delete',
}

const SHELF_TYPES = {
  OBJECT: 'object',
  ARRAY: 'array',
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  NULL: 'null',
  OTHER: 'other',
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
  return SHELF_TYPE_RANKINGS[getShelfType(value)]
}

export const getShelfType = (value) => {
  if (value === null) return SHELF_TYPES.NULL
  if (Array.isArray(value)) return SHELF_TYPES.ARRAY
  return Object.keys(SHELF_TYPE_RANKINGS).includes(typeof value) ? typeof(value) : SHELF_TYPES.OTHER
}

const deepCopy = (data) => JSON.parse(JSON.stringify(data))

// Intentional usage of undefined over null as shelves use nulls to represent the data not existing.
const getDeepValueByKey = (data, key) => {
  if (key.length === 0) {
    return data
  }
  if (data === null) {
    return undefined
  }
  let layer = data
  for (let i = 0; i < key.length - 1; i++) {
    layer = layer[key[i]]
    if (layer === null || layer === undefined) {
      return undefined
    }
  }

  layer = layer[key[key.length - 1]]

  return layer
}

// This should have something added where if it can't find it, it returns -1.
const getDeepVersionByKey = (versions, key) => {
  if (key.length === 0) {
    return Array.isArray(versions) ? versions[1] : versions
  }
  let layer = versions
  key.forEach((k) => {
    // Second value is the version, first is the object.
    layer = Array.isArray(layer) ? layer[0][k]: layer[k]
  })
  return Array.isArray(layer) ? layer[1] : layer || 0
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

const createVersionByType = (type, version) => {
  if (type === SHELF_TYPES.OBJECT) {
    return [{}, version]
  } else if (type === SHELF_TYPES.ARRAY) {
    return [[], version]
  }
  return version
}

const setDeepVersionByKey = (versions, key, version, type) => {
  if (key.length === 0) {
    return createVersionByType(type, version)
  }
  let layer = versions
  for (let i = 0; i < key.length - 1; i++) {
    layer = Array.isArray(layer) ? layer[0][key[i]] : layer[key[i]]
  }

  if (Array.isArray(layer)) {
    layer[0][key[key.length - 1]] = createVersionByType(type, version)
  } else {
    layer[key[key.length - 1]] = createVersionByType(type, version)
  }

  return versions
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
  shelf.versions = setDeepVersionByKey(shelf.versions, setOp.key, setOp.version, getShelfType(setOp.value))
  shelf.value = setDeepValueByKey(shelf.value, setOp.key, setOp.value)
}

const shouldApplySetOp = (shelf, setOp) => {
  const shelfValue = getDeepValueByKey(shelf.value, setOp.key)
  if (shelfValue === undefined) {
    return true
  }
  const shelfVersion = getDeepVersionByKey(shelf.versions, setOp.key)
  if (shelfVersion < setOp.version) {
    return true
  } else if (shelfVersion === setOp.version) {
    const shelfOrder = compareShelfValues(shelfValue, setOp.value)
    if (shelfOrder === 1) {
      return true
    }
  }

  return false
}

// TODO
const applyInsertOp = (shelf, insertOp) => {

}

// TODO
const shouldApplyInsertOp = (shelf, insertOp) => {
  return false
}

// TODO
const applyDeleteOp = (shelf, deleteOp) => {

}

// TODO
const shouldApplyDeleteOp = (shelf, deleteOp) => {
  return false
}

export const createOp = {
  set: (key, value, version) => ({ key, type: OPERATIONS.SET, value, version }),
  insert: (key, version, value, pos) => ({ key, type: OPERATIONS.INSERT, version, value, pos }),
  delete: (key, version, amount, pos) => ({ key, type: OPERATIONS.DELETE, version, amount, pos }),
}

// In order to handshake properly you need to store a uuid.
export const createShelf = (value = null) => {
  const shelf = {
    value: null,
    versions: 0,
    history: [],
  }
  if (value) {
    const ops = getLocalChanges(shelf.value, value, 0)
    return applyOps(shelf, ops)
  }

  return shelf
}

// export const shouldPushOp = (shelf, op) => {
//   const historyContainsOp = shelf.history.some(patch =>
//     JSON.stringify(patch.key) === JSON.stringify(op.key) &&
//     patch.type === op.type &&
//     patch.value === op.value &&
//     JSON.stringify(patch.version) === JSON.stringify(op.version)
//   )
//   return !historyContainsOp
// }

const addOpToHistory = (shelf, op) => {
  const keyIndex = shelf.history.findIndex((patch) => JSON.stringify(patch.key) === JSON.stringify(op.key))
  if (keyIndex === -1) {
    shelf.history.push(op)
  } else {
    shelf.history[keyIndex] = op
  }
}

// Maybe I should mutate the state *shrugs*
export const applyOp = (shelf, op) => {
  const shelfCopy = deepCopy(shelf)

  // This version keeps the history
  // if (shouldPushOp(shelfCopy, op)) {
  //   shelfCopy.history.push(op)
  // }

  if (op.type === OPERATIONS.SET) {
    if (shouldApplySetOp(shelfCopy, op)) {
      addOpToHistory(shelfCopy, op)
      applySetOp(shelfCopy, op)
    }
  } else if (op.type === OPERATIONS.INSERT) {
    if (shouldApplyInsertOp(shelfCopy, op)) {
      shelfCopy.history.push(op)
      applyInsertOp(shelfCopy, op)
    }
  } else if (op.type === OPERATIONS.DELETE) {
    if (shouldApplyDeleteOp(shelfCopy, op)) {
      shelfCopy.history.push(op)
      applyDeleteOp(shelfCopy, op)
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

const createOpsFromData = (data, version = 1, key = [], ops = []) => {
  const shelfType = getShelfType(data)

  if (shelfType === SHELF_TYPES.OBJECT) {
    ops.push(
      createOp.set(
        key,
        {},
        version,
      )
    )

    const keys = [
      ...new Set(
        [
          ...Object.keys(data),
        ]
      )
    ]

    keys.forEach(k => {
      createOpsFromData(data[k] ?? null, version, [...key, k], ops)
    })
  } else if (shelfType === SHELF_TYPES.ARRAY) {
    ops.push(
      createOp.set(
        key,
        [],
        version,
      )
    )

    data.forEach((element, i) => {
      createOpsFromData(data[i] ?? null, version, [...key, i], ops)
    })
  } else {
    ops.push(
      createOp.set(
        key,
        data,
        version,
      )
    )
  }

  return ops
}

export const getLocalChanges = (data, data2, versions, key = [], ops = []) => {
  if (data === undefined) {
    ops.push(...createOpsFromData(data2, 1, key))
    return ops
  }

  const shelfType = getShelfType(data)
  const shelfType2 = getShelfType(data2)

  if (data === null) {
    ops.push(...createOpsFromData(data2, getDeepVersionByKey(versions, key) + 1, key))
    return ops
  }

  if (shelfType === SHELF_TYPES.OBJECT && shelfType2 === SHELF_TYPES.OBJECT) {
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
  } else if (shelfType === SHELF_TYPES.ARRAY && shelfType2 === SHELF_TYPES.ARRAY) {
    const maxLength = Math.max(data.length, data2.length)

    for (let i = 0; i < maxLength; i++) {
      getLocalChanges(data[i] ?? null, data2[i] ?? null, versions, [...key, i], ops)
    }

    return ops
  }
  ops.push(
    createOp.set(
      key,
      data2,
      getDeepVersionByKey(versions, key) + 1
    )
  )
  return ops
}

// const shelf = createShelf({
//   position: { x: 5, y: 7 },
//   title: 'Lava world',
//   tags: ['lava', 'hard'],
// })
//
// console.log('_SHELF_', JSON.stringify(shelf, null, 2))
// const localChanges = getLocalChanges(shelf.value, {
//   // map: [],
//   title: 'Lava world 2',
//   tags: ['lava'],
//   entities: [
//     {
//       position: {
//         x: 5,
//         y: 7,
//       },
//     },
//   ],
// }, shelf.versions)
//
// console.log('_LOCAL_CHANGES_', localChanges)
//
// const modifiedShelf = applyOps(shelf, localChanges)
// console.log('_MODIFIED_SHELF_', JSON.stringify(modifiedShelf, null, 2))
