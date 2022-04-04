// A proof of concept for list based CRDT, needs a thorough refactor & testing.
const values = {}
// This is the versions from the shelf? Sort of?
const versions = {}
const parents = {}
const lefts = {}
const positions = {}
// This will be stored in the shelf
let finalValue = []
// Where should the CRDT data sit?
// What is *values* were actually indices for where they are in the shelf?
// That way it could just map onto it for ordering reasons, then the value resolution could entirely happen in the shelf itself.

// History can probably just be top level
const history = []
const userOrder = {}
const receivedSequences = {}
const order = []

const deepCopy = value => JSON.parse(JSON.stringify(value))

const OPERATIONS = {
  SET: 'set',
  INSERT: 'insert',
  DELETE: 'delete',
}

export const createOp = {
  set: (userId, value, pos, latest, version) => ({ type: OPERATIONS.SET, userId, value, pos, latest, version }),
  insert: (user, value, pos, latest) => ({ type: OPERATIONS.INSERT, user, value, pos, latest }),
}

const getDepth = (order, key) => {
  for (let i = 0; i < order.length; i++) {
    for (let j = 0; j < order[i].length; j++) {
      if (order[i][j] === key) {
        return i
      }
    }
  }
  return -1
}

const getPosition = (order, key) => {
  let pos = 0
  for (let i = 0; i < order.length; i++) {
    for (let j = 0; j < order[i].length; j++) {
      if (order[i][j] === key) {
        return pos
      }
      pos++
    }
  }
  return -1
}

const getLayerInsertIndex = (positions, layer, key, pos) => {
  let insertIndex = 0

  for (let element in layer) {
    const currentPosition = positions[element]
    if (pos > currentPosition) {
      break
    }
    if (pos === currentPosition && key < element) {
      break
    }
    insertIndex++
  }
  return insertIndex
}

const insertInOrder = (key, parents, pos, userOrder, order) => {
  const insertDepth = parents.reduce(
    (previousValue, currentValue) => Math.max(previousValue, getDepth(order, currentValue)),
    -1
  ) + 1
  // console.log('_KEY_', key)
  // console.log('_INSERT_DEPTH_', insertDepth)
  // console.log('_ORDER_', order)
  order[insertDepth] = order[insertDepth] || []

  const insertIndex = getLayerInsertIndex(
    positions,
    userOrder[insertDepth],
    key,
    pos,
  )

  order[insertDepth].splice(insertIndex, 0, key)
}

const getInsertRangesFromLatest = (receivedSequences, userId, latest) => {
  const insertRanges = []
  receivedSequences[userId] = receivedSequences[userId] || {}
  latest.forEach(l => {
    if (l.id !== -1) {
      // console.log('_BEFORE_')
      // console.log('_L_SEQ_', l.seq)
      // console.log('_RECEIVED_SEQUENCES_L_ID_', receivedSequences[userId][l.id])
      if (receivedSequences[userId][l.id] === undefined) {
        receivedSequences[userId][l.id] = l.seq
        insertRanges.push(`${l.id}:${l.seq}`)
      }
      for (let i = 0; i < l.seq - receivedSequences[userId][l.id]; i++) {
        insertRanges.push(`${l.id}:${l.seq + i + 1}`)
        // console.log('_INNER_')
      }
    // console.log('_AFTER_')
    }
  })
  // console.log('_INSERT_RANGES_', insertRanges)
  return insertRanges
}

const updateReceivedSequencesFromLatest = (receivedSequences, userId, latest) => {
  receivedSequences[userId] = receivedSequences[userId] || {}
  latest.forEach(l => {
    if (l.id !== -1) {
      receivedSequences[userId][l.id] = l.seq
    }
  })
}

const insertParentsIntoUserOrder = (userId, latest) => {
  const insertRanges = getInsertRangesFromLatest(receivedSequences, userId, latest)
  // console.log('_INSERT_RANGES_', insertRanges)
  // console.log('_USER_ORDER_', userOrder)
  updateReceivedSequencesFromLatest(receivedSequences, userId, latest)

  userOrder[userId] = userOrder[userId] || []

  const insertParents = insertRanges.map(ins => parents[ins])

  for (let i = 0; i < insertRanges.length; i++) {
    insertInOrder(insertRanges[i], insertParents[i], positions[insertRanges[i]], userOrder[userId], userOrder[userId])
  }
}

const getKeyByPos = (userId, pos) => {
  const list = []
  userOrder[userId].flat().forEach(element => {
    list.splice(positions[element], 0, element)
  })

  return list[pos] || '-1:-1'
}

// const translateUserPositionToPosition = (userId, pos, latest) => {
//
// }

// This could be replaced with getInsertPosition
const insert = (user, value, pos, latest) => {
  const parentKeys = latest.map(l => `${l.id}:${l.seq}`)

  // Out of order, reject insert.
  if (parentKeys.filter(pk => pk !== `-1:-1`).some(pk => parents[pk] === undefined)) {
    return
  }

  const key = `${user.id}:${user.seq}`

  values[key] = value
  positions[key] = pos
  versions[key] = 1
  parents[key] = deepCopy(latest)
  // console.log('_PARENTS_KEY_', parents[key])

  insertParentsIntoUserOrder(user.id, latest)

  lefts[key] = getKeyByPos(user.id, pos - 1)

  receivedSequences[user.id][user.id] = user.seq

  insertInOrder(key, parentKeys, pos, userOrder[user.id], userOrder[user.id])

  insertInOrder(key, parentKeys, getPosition(order, lefts[key]), userOrder[user.id], order)

  const finalList = []
  order.flat().forEach(element => {
    if (finalList.length === 0) {
      finalList.push(element)
    } else {
      const insIndex = finalList.findIndex(e => e === lefts[element]) + 1
      finalList.splice(insIndex, 0, element)
    }
  })

  finalValue = finalList.map(e => values[e])

  // user.seq++
  history.push(createOp.insert(deepCopy(user), value, pos, deepCopy(latest)))
}

// This could be replaced with getSetPosition
const replace = (userId, value, pos, latest, version) => {
  const parentKeys = latest.map(l => `${l.id}:${l.seq}`)

  // Out of order, reject replace.
  if (parentKeys.filter(pk => pk !== `-1:-1`).some(pk => parents[pk] === undefined)) {
    return
  }

  insertParentsIntoUserOrder(userId, latest)

  const key = getKeyByPos(userId, pos)

  // Don't update the value
  if (versions[key] > version) {
    return
  } else if (versions[key] === version) {
    // Then you need to decide which element should survive
    const v = JSON.stringify(value)
    const v2 = JSON.stringify(values[key])
    if (v >= v2) {
      return
    }
  }

  values[key] = value
  versions[key] = version

  const finalList = []
  order.flat().forEach(element => {
    if (finalList.length === 0) {
      finalList.push(element)
    } else {
      const insIndex = finalList.findIndex(e => e === lefts[element]) + 1
      finalList.splice(insIndex, 0, element)
    }
  })

  finalValue = finalList.map(e => values[e])

  history.push(createOp.set(userId, value, pos, deepCopy(latest), version))
}

const user = { id: 0, seq: 0 }
const latest = { id: -1, seq: -1 }

const user2 = { id: 1, seq: 0 }
const latest2 = { id: -1, seq: -1 }

// insert(user, 'x', 0, [latest])
// user.seq = 1
// latest.id = 0
// latest.seq = 0
// insert(user, 'A', 1, [latest])
// user.seq = 2
// latest.seq = 1
// insert(user, 'a', 2, [latest])
// user.seq = 3
// latest.seq = 2
//
// latest2.id = 0
// latest2.seq = 0
// insert(user2, 'B', 1, [latest2])
// console.log('_USER_ORDER_', userOrder)
// console.log('_FINAL_VALUE_', finalValue)
// user2.seq = 1
// latest2.id = 1
// latest2.seq = 0
// insert(user2, 'b', 2, [latest2])

insert(user, { text: 'Hello world' }, 0, [latest])
latest.id = 0
latest.seq = 0
user.seq++
insert(user, { text: 'Second post' }, 1, [latest])
latest.seq = 1
user.seq++
insert(user, { text: 'Third post' }, 2, [latest])
latest.seq = 2
user.seq++
insert(user, { text: 'Fourth post' }, 3, [latest])
latest.seq = 3
latest2.id = 0
latest2.seq = 3
user.seq++
insert(user2, { text: 'Test' }, 0, [latest2])
latest.id = 1
latest.seq = 0
user2.seq++
insert(user, { text: 'Fifth post' }, 2, [latest, { id: 1, seq: 0 }])
latest.id = 0
latest.seq = 4
user.seq++
// replace(user.id, { text: 'Hello world2' }, 0, [latest], 2)

console.log('_ORDER_', order)
console.log('_FINAL_VALUE_', finalValue)
// console.log('_HISTORY_', history)
// console.log('_VALUES_', values)
// console.log('_PARENTS_', parents)
// console.log('_LEFTS_', lefts)
// console.log('_USER_ORDER_', userOrder)
// console.log('_ORDER_', order)

// Add parents to user views
// Transform user position to "real" position
// Replace values in regular shelf
// Replace values in order
