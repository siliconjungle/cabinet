const store = {}

const getKeys = async () => Object.keys(store)

const getShelfByKey = async key => store[key] || null

const setShelfByKey = async (key, shelf) => store[key] = shelf

export default {
  getKeys,
  getShelfByKey,
  setShelfByKey,
}
