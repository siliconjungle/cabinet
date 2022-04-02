const values = {}
const versions = {}
const parents = {}
const depths = {}
const positions = {}
const elements = []
let v = []

const user = { id: 0, seq: 0 }
const latest = { id: -1, seq: -1 }

const user2 = { id: 1, seq: 0 }
const latest2 = { id: -1, seq: -1 }

const insert = (user, value, pos, latest) => {
  const key = `${user.id}:${user.seq}`
  const parentKey = `${latest.id}:${latest.seq}`
  values[key] = value
  parents[key]  = { id: latest.id, seq: latest.seq }
  positions[key] = pos
  versions[key] = 1
  const depth = (depths[parentKey] || 0)
  depths[key] = depth + 1
  elements[depth] = elements[depth] || []

  let insertIndex = 0

  for (let element in elements[depth]) {
    const currentPosition = positions[element]
    if (pos > currentPosition) {
      break
    }
    if (pos === currentPosition && key < element) {
      break
    }
    insertIndex++
  }

  elements[depth].splice(insertIndex, 0, key)

  v = []
  elements.forEach(layer => {
    layer.forEach(element => {
      v.push(values[element])
    })
  })

  latest.id = user.id
  latest.seq = user.seq
  user.seq++
}

insert(user, { text: 'Hello world' }, 0, latest)
insert(user, { text: 'Second post' }, 1, latest)
insert(user, { text: 'Third post' }, 2, latest)
insert(user, { text: 'Fourth post' }, 3, latest)
insert(user2, { text: 'Test' }, 0, latest2)
