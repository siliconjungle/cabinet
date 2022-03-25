const store = {}

const getKeys = async (cabinet) => {
  Object.keys(store[cabinet] || [])
}

const getShelfByKey = async (cabinet, key) => {
  return store[cabinet]?.[key] || null
}

const setShelfByKey = async (cabinet, key, shelf) => {
  if (store[cabinet] === undefined) {
    store[cabinet] = {}
  }
  store[cabinet][key] = shelf
}

export default {
  getKeys,
  getShelfByKey,
  setShelfByKey,
}
