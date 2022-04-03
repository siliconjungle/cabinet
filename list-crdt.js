// A proof of concept for list based CRDT, needs a thorough refactor & testing.
const values = {}
const versions = {}
const parents = {}
const lefts = {}
const positions = {}
let finalValue = []

const history = []
const userOrder = {}
const receivedSequences = {}
const order = []

const deepCopy = value => JSON.parse(JSON.stringify(value))

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
      for (let i = 0; i < l.seq - receivedSequences[userId][l.id]; i++) {
        insertRanges.push(`${l.id}:${l.seq + i + 1}`)
      }
    }
  })
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

  const insertRanges = getInsertRangesFromLatest(receivedSequences, user.id, latest)
  updateReceivedSequencesFromLatest(receivedSequences, user.id, latest)

  userOrder[user.id] = userOrder[user.id] || []

  const insertParents = insertRanges.map(ins => parents[ins])

  for (let i = 0; i < insertRanges.length; i++) {
    insertInOrder(insertRanges[i], insertParents[i], positions[insertRanges[i]], userOrder[user.id], userOrder[user.id])
  }

  // Find id to insert to the left of by constructing string
  const list = []
  userOrder[user.id].flat().forEach(element => {
    list.splice(positions[element], 0, element)
  })

  receivedSequences[user.id][user.id] = user.seq

  insertInOrder(key, parentKeys, pos, userOrder[user.id], userOrder[user.id])

  lefts[key] = list[positions[key] - 1] || '-1:-1'

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

  user.seq++
  history.push(deepCopy(user), value, pos, deepCopy(latest))
}

const user = { id: 0, seq: 0 }
const latest = { id: -1, seq: -1 }

const user2 = { id: 1, seq: 0 }
const latest2 = { id: -1, seq: -1 }

insert(user, { text: 'Hello world' }, 0, [latest])
latest.id = 0
latest.seq = 0
insert(user, { text: 'Second post' }, 1, [latest])
latest.seq = 1
insert(user, { text: 'Third post' }, 2, [latest])
latest.seq = 2
insert(user, { text: 'Fourth post' }, 3, [latest])
latest.seq = 3
latest2.id = 0
latest2.seq = 3
insert(user2, { text: 'Test' }, 0, [latest2])
latest.id = 1
latest.seq = 0
insert(user, { text: 'Fifth post' }, 2, [latest, { id: 1, seq: 0 }])

console.log('_FINAL_VALUE_', finalValue)
