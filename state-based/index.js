import EventEmitter from 'events'
import { v4 as uuidv4 } from 'uuid'
import {
  createShelf,
  getDataFromShelf,
  mergeShelves,
  createLocalChangesDiff,
} from './shelf.js'

function Cabinet() {
  this.emitter = new EventEmitter()
  this.emitter.setMaxListeners(0)
  this.shelfEmitter = new EventEmitter()
  this.shelfEmitter.setMaxListeners(0)
  this.store = {}
  this.versions = {}
}

Cabinet.prototype.getKeys = function() {
  return Object.keys(this.store)
}

Cabinet.prototype.getVersionsByKey = function(key) {
  return Object.values(this.versions[key] || {})
}

Cabinet.prototype.addVersionByKey = function(key, version) {
  if (this.versions[key] === undefined) {
    this.versions[key] = []
  }
  this.versions[key].push(version)
}

Cabinet.prototype.keyIncludesVersion = function(key, version) {
  return this.versions[key]?.includes(version)
}

Cabinet.prototype.getLatestVersionByKey = function(key) {
  return this.versions[key]?.[this.versions[key].length - 1] || null
}

Cabinet.prototype.removeShelf = function(key) {
  delete this.store[key]
  delete this.versions[key]
}

Cabinet.prototype.getState = function(key) {
  return this.store[key] && getDataFromShelf(this.store[key]) || null
}

Cabinet.prototype.setState = function (key, state) {
  this.store[key] = this.store[key] ?
    mergeShelves(this.store[key], createLocalChangesDiff(this.store[key], state)) :
    createShelf(state)

  const version = uuidv4()
  this.addVersionByKey(key, version)

  this.shelfEmitter.emit(
    key,
    key,
    this.store[key],
    version,
  )
  if (this.emitter.listenerCount(key) > 0) {
    this.emitter.emit(
      key,
      key,
      this.getState(key),
      version,
    )
  }
}

Cabinet.prototype.getShelf = function(key) {
  return this.store[key] || null
}

Cabinet.prototype.setShelf = function(key, shelf, version) {
  if (this.keyIncludesVersion(key, version)) {
    return
  }

  this.store[key] = this.store[key] ? mergeShelves(this.store[key], shelf) : shelf
  this.addVersionByKey(key, version)
  this.shelfEmitter.emit(
    key,
    key,
    this.store[key],
    version,
  )
  if (this.emitter.listenerCount(key) > 0) {
    this.emitter.emit(
      key,
      key,
      this.getState(key),
      version,
    )
  }
}

Cabinet.prototype.addSubscription = function(key, callback) {
  this.emitter.addListener(key, callback)
}

Cabinet.prototype.removeSubscription = function(key, callback) {
  this.emitter.removeListener(key, callback)
}

Cabinet.prototype.SubscriptionCount = function(key) {
  this.emitter.listenerCount(key)
}

Cabinet.prototype.addShelfSubscription = function(key, callback) {
  this.shelfEmitter.addListener(key, callback)
}

Cabinet.prototype.removeShelfSubscription = function(key, callback) {
  this.shelfEmitter.removeListener(key, callback)
}

Cabinet.prototype.getShelfSubscriptionCount = function(key) {
  this.shelfEmitter.listenerCount(key)
}

export default Cabinet
