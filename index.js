import EventEmitter from 'events'
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

// Should transclusion be a thing? Not sure if it's needed.
const store = {}

export const getKeys = () => Object.keys(store)

export const getState = (key) => store[key] && getDataFromShelf(store[key]) || null

export const setState = (key, state) => {
  store[key] = store[key] ? mergeShelves(store[key], createLocalChangesDiff(store[key], state)) : createShelf(state)
  shelfEmitter.emit(
    key,
    key,
    store[key],
  )
  if (emitter.listenerCount(key) > 0) {
    emitter.emit(
      key,
      key,
      getState(key),
    )
  }
}

export const getShelf = (key) => store[key] || null

export const setShelf = (key, shelf) => {
  store[key] = store[key] ? mergeShelves(store[key], shelf) : shelf
  shelfEmitter.emit(
    key,
    key,
    store[key],
  )
  if (emitter.listenerCount(key) > 0) {
    emitter.emit(
      key,
      key,
      getState(key),
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
