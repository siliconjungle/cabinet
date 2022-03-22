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
  this.shelfEmitter = new EventEmitter()
  this.shelfEmitter.setMaxListeners(0)
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
    this.setShelf(key, appliedOps)
  } else {
    shelf = createShelf(state)
    this.setShelf(key, shelf)
  }
}

Index.prototype.setShelf = function(key, shelf) {
  this.store[key] = shelf

  // Currently not handling success / failure.
  this.repository.setShelfByKey(key, shelf)

  this.shelfEmitter.emit(
    key,
    key,
    shelf,
  )
  if (this.emitter.listenerCount(key) > 0) {
    this.emitter.emit(
      key,
      key,
      shelf.value,
    )
  }
}

Index.prototype.applyOp = async function(key, op) {
  let shelf = await this.getShelf(key)
  this.setShelf(key, applyOp(shelf || createShelf(), op))
}

Index.prototype.applyOps = async function(key, ops) {
  console.log('_KEY_', key)
  console.log('_OPS_', ops)
  const shelf = await this.getShelf(key)
  console.log('_CURRENT_SHELF_', shelf)
  this.setShelf(key, applyOps(shelf || createShelf(), ops))
}

Index.prototype.initShelf = async function(key) {
  console.log('_INIT_SHELF_', key)
  const shelf = await this.repository.getShelfByKey(key)
  if (shelf) {
    this.setShelf(key, shelf)
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
  if (this.emitter.listenerCount(key) === 0 && this.shelfEmitter.listenerCount(key) === 0) {
    this.removeShelf(key)
  }
}

Index.prototype.SubscriptionCount = function(key) {
  this.emitter.listenerCount(key)
}

Index.prototype.addShelfSubscription = function(key, callback) {
  if (!this.store[key]) {
    this.initShelf(key)
  }
  this.shelfEmitter.addListener(key, callback)
}

Index.prototype.removeShelfSubscription = function(key, callback) {
  this.shelfEmitter.removeListener(key, callback)
  if (this.emitter.listenerCount(key) === 0 && this.shelfEmitter.listenerCount(key) === 0) {
    this.removeShelf(key)
  }
}

Index.prototype.getShelfSubscriptionCount = function(key) {
  this.shelfEmitter.listenerCount(key)
}

export default Index
