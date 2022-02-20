import EventEmitter from 'events'
import { v4 as uuidv4 } from 'uuid'
import {
  createShelf,
  getDataFromShelf,
  mergeShelves,
  createLocalChangesDiff,
} from './shelf.js'

// Adding setMaxListeners(0) is potentially dangerous for memory leak reasons.
const shelfEmitter = new EventEmitter()
shelfEmitter.setMaxListeners(0)

const emitter = new EventEmitter()
emitter.setMaxListeners(0)

const store = {}
const versions = {}

export const getKeys = () => Object.keys(store)

export const getVersionsByKey = key => Object.values(versions[key] || {})

export const addVersionByKey = (key, version) => {
  if (versions[key] === undefined) {
    versions[key] = []
  }
  versions[key].push(version)
}

export const keyIncludesVersion = (key, version) => {
  return versions[key]?.includes(version)
}

export const getLatestVersionByKey = key => {
  return versions[key]?.[versions[key].length - 1] || null
}

export const removeShelf = (key) => {
  delete store[key]
  delete versions[key]
}

export const getState = (key) => store[key] && getDataFromShelf(store[key]) || null

export const setState = (key, state) => {
  store[key] = store[key] ? mergeShelves(store[key], createLocalChangesDiff(store[key], state)) : createShelf(state)
  const version = uuidv4()
  addVersionByKey(key, version)

  shelfEmitter.emit(
    key,
    key,
    store[key],
    version,
  )
  if (emitter.listenerCount(key) > 0) {
    emitter.emit(
      key,
      key,
      getState(key),
      version,
    )
  }
}

// Should this also return the version?
// If I separate it into separate data where they aren't bound,
// how likely is it that something will happen between each of them?
export const getShelf = (key) => store[key] || null

export const setShelf = (key, shelf, version) => {
  if (keyIncludesVersion(key, version)) {
    return
  }

  // This could be updated to only change the version if something is different.
  store[key] = store[key] ? mergeShelves(store[key], shelf) : shelf
  versions[key] = version
  shelfEmitter.emit(
    key,
    key,
    store[key],
    version,
  )
  if (emitter.listenerCount(key) > 0) {
    emitter.emit(
      key,
      key,
      getState(key),
      version,
    )
  }
}

export const addSubscription = (key, callback) => {
  emitter.addListener(key, callback)
}

export const removeSubscription = (key, callback) => {
  emitter.removeListener(key, callback)
}

export const getSubscriptionCount = (key) => emitter.listenerCount(key)

export const addShelfSubscription = (key, callback) => {
  shelfEmitter.addListener(key, callback)
}

export const removeShelfSubscription = (key, callback) => {
  shelfEmitter.removeListener(key, callback)
}

export const getShelfSubscriptionCount = (key) => shelfEmitter.listenerCount(key)
