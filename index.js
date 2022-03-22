import EventEmitter from 'events'
import {
  createShelf,
  getLocalChanges,
  applyOp,
  applyOps,
} from './shelf.js'

// Repository on the client would be a wrapper around local storage
// On the server it would be hooking into a database.
function Index (repository) {
  this.emitter = new EventEmitter()
  this.emitter.setMaxListeners(0)
  this.repository = repository
  this.store = {}
}

Index.prototype.getSubscribedKeys = function() {
  return Object.keys(this.store)
}

Index.prototype.getKeys = async function() {
  return (await this.repository.getKeys())
}

Index.prototype.removeShelf = function(key) {
  delete this.store[key]
}

Index.prototype.deleteShelf = async function(key) {
  delete this.store[key]
  await this.repository.removeShelf(key)
}

Index.prototype.getState = async function(key) {
  return this.store[key]?.value || (await this.repository.getShelfByKey(key).value) || createShelf().value
}

Index.prototype.getShelf = async function(key) {
  return this.store[key] || (await this.repository.getShelfByKey(key)) || createShelf()
}

Index.prototype.setState = async function (key, state) {
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

// I actually think you could entirely remove one of them
Index.prototype.setShelf = function(key, shelf, ops) {
  this.store[key] = shelf

  // Currently not handling success / failure.
  this.repository.setShelfByKey(key, shelf)

  this.emitter.emit(
    key,
    key,
    shelf,
    ops,
  )
}

Index.prototype.applyOp = async function(key, op) {
  let shelf = await this.getShelf(key)
  this.setShelf(key, applyOp(shelf || createShelf(), op), [op])
}

Index.prototype.applyOps = async function(key, ops) {
  const shelf = await this.getShelf(key)
  this.setShelf(key, applyOps(shelf || createShelf(), ops), ops)
}

Index.prototype.initShelf = async function(key) {
  const shelf = await this.repository.getShelfByKey(key)
  if (shelf) {
    this.setShelf(key, shelf, shelf.history)
  }
}

Index.prototype.addSubscription = function(key, callback) {
  if (!this.store[key]) {
    this.initShelf(key)
  }
  this.emitter.addListener(key, callback)
}

Index.prototype.removeSubscription = function(key, callback) {
  this.emitter.removeListener(key, callback)
  if (this.emitter.listenerCount(key) === 0) {
    this.removeShelf(key)
  }
}

Index.prototype.SubscriptionCount = function(key) {
  this.emitter.listenerCount(key)
}

export default Index
