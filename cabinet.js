import EventEmitter from 'events'
import {
  createShelf,
  getLocalChanges,
  applyOp,
  applyOps,
} from './shelf.js'

// Repository on the client would be a wrapper around local storage
// On the server it would be hooking into a database.
// This needs to be able to pull in a type definition
// To begin with, lets start with strict definitions.
// In the future we can allow for types that are like "this, or this, or this".
function Cabinet (repository, name) {
  this.emitter = new EventEmitter()
  this.emitter.setMaxListeners(0)
  this.repository = repository
  this.name = name
  this.store = {}
}

Cabinet.prototype.getSubscribedKeys = function() {
  return Object.keys(this.store)
}

Cabinet.prototype.getKeys = async function() {
  return (await this.repository.getKeys(this.name))
}

Cabinet.prototype.removeShelf = function(key) {
  delete this.store[key]
}

Cabinet.prototype.deleteShelf = async function(key) {
  delete this.store[key]
  await this.repository.removeShelf(this.name, key)
}

Cabinet.prototype.getState = async function(key) {
  return this.store[key]?.value || (await this.repository.getShelfByKey(this.name, key).value) || createShelf().value
}

Cabinet.prototype.getShelf = async function(key) {
  return this.store[key] || (await this.repository.getShelfByKey(this.name, key)) || createShelf()
}

Cabinet.prototype.setState = async function (key, state) {
  let shelf = await this.getShelf(key)
  if (shelf) {
    const localChanges = getLocalChanges(shelf.value, state, shelf.versions)
    const appliedOps = applyOps(shelf, localChanges)
    this.setShelf(key, appliedOps, localChanges)
    return localChanges
  } else {
    shelf = createShelf(state)
    this.setShelf(key, shelf, shelf.history)
    return shelf.history
  }
}

Cabinet.prototype.setShelf = function(key, shelf, ops) {
  this.store[key] = shelf

  // Currently not handling success / failure.
  this.repository.setShelfByKey(this.name, key, shelf)

  this.emitter.emit(
    key,
    this.name,
    key,
    shelf,
    ops,
  )
}

Cabinet.prototype.applyOp = async function(key, op) {
  let shelf = await this.getShelf(key)
  this.setShelf(key, applyOp(shelf || createShelf(), op), [op])
}

Cabinet.prototype.applyOps = async function(key, ops) {
  const shelf = await this.getShelf(key)
  this.setShelf(key, applyOps(shelf || createShelf(), ops), ops)
}

Cabinet.prototype.initShelf = async function(key) {
  const shelf = await this.repository.getShelfByKey(this.name, key)
  if (shelf) {
    this.setShelf(key, shelf, shelf.history)
  }
}

Cabinet.prototype.addSubscription = function(key, callback) {
  if (!this.store[key]) {
    this.initShelf(key)
  }
  this.emitter.addListener(key, callback)
}

Cabinet.prototype.removeSubscription = function(key, callback) {
  this.emitter.removeListener(key, callback)
  if (this.emitter.listenerCount(key) === 0) {
    this.removeShelf(key)
  }
}

Cabinet.prototype.getSubscriptionCount = function(key) {
  this.emitter.listenerCount(key)
}

export default Cabinet
