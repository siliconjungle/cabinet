// A proof of concept for list based CRDT, needs a thorough refactor & testing.
const values = {}
const versions = {}
const parents = {}
const lefts = {}
const positions = {}
let finalValue = []

const deepCopy = value => JSON.parse(JSON.stringify(value))

const history = []
const userOrder = {}
const receivedSequences = {}
const order = []

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

  const insertRanges = []
  receivedSequences[user.id] = receivedSequences[user.id] || {}
  latest.forEach(l => {
    if (l.id !== -1) {
      for (let i = 0; i < l.seq - receivedSequences[user.id][l.id]; i++) {
        insertRanges.push(`${l.id}:${l.seq + i + 1}`)
      }
      receivedSequences[user.id][l.id] = l.seq
    }
  })

  userOrder[user.id] = userOrder[user.id] || []

  const insertParents = insertRanges.map(ins => parents[ins])

  for (let i = 0; i < insertRanges.length; i++) {
    // Get the max depth of the parents for each element in insertRanges
    const insDepth = insertParents[i].reduce(
      (previousValue, currentValue) => Math.max(previousValue, getDepth(userOrder[user.id], currentValue)),
      -1
    ) + 1
    userOrder[user.id][insDepth] = userOrder[user.id][insDepth] || []

    let insertIndex = 0

    for (let element in userOrder[user.id][insDepth]) {
      const currentPosition = positions[element]
      // Get the pos of this element
      const insertPos = positions[insertRanges[i]]
      if (insertPos > currentPosition) {
        break
      }
      if (insertPos === currentPosition && insertRanges[i] < element) {
        break
      }
      insertIndex++
    }

    userOrder[user.id][insDepth].splice(insertIndex, 0, insertRanges[i])
  }

  // Find id to insert to the left of by constructing string
  const list = []
  userOrder[user.id].flat().forEach(element => {
    list.splice(positions[element], 0, element)
  })

  receivedSequences[user.id][user.id] = user.seq
  insertRanges.push(key)
  const insDepth = parentKeys.reduce(
    (previousValue, currentValue) => Math.max(previousValue, getDepth(userOrder[user.id], currentValue)),
    -1
  ) + 1
  userOrder[user.id][insDepth] = userOrder[user.id][insDepth] || []

  let insertIndex = 0

  for (let element in userOrder[user.id][insDepth]) {
    const currentPosition = positions[element]
    // Get the pos of this element
    if (pos > currentPosition) {
      break
    }
    if (pos === currentPosition && key < element) {
      break
    }
    insertIndex++
  }
  userOrder[user.id][insDepth].splice(insertIndex, 0, key)

  lefts[key] = list[positions[key] - 1] || '-1:-1'

  const insertDepth = parentKeys.reduce(
    (previousValue, currentValue) => Math.max(previousValue, getDepth(order, currentValue)),
    -1
  ) + 1
  order[insertDepth] = order[insertDepth] || []

  insertIndex = 0
  const insLeft = lefts[key]
  const insPos = getPosition(order, insLeft)

  for (let element in order[insertDepth]) {
    const currentLeft = lefts[element]
    const currentPosition = getPosition(order, currentLeft)
    if (insPos > currentPosition) {
      break
    }
    if (insPos === currentPosition && key < element) {
      break
    }
    insertIndex++
  }
  order[insertDepth].splice(insertIndex, 0, key)

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
