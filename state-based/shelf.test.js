import {
  SHELF_TYPE_RANKINGS,
  getShelfTypeRanking,
  compareValues,
  compareShelves,
  // diffShelves,
  // mergeShelves,
  createShelf,
  getDataFromShelf,
  createLocalChangesDiff,
} from './shelf.js'

test('Create single value shelf', () => {
  const shelf = createShelf(5)
  expect(shelf).toEqual([5, 0])
})

test('Create object shelf', () => {
  const shelf = createShelf({
    x: 50,
    y: 50,
    name: 'James',
    color: {
      r: 255,
      g: 0,
      b: 0,
    },
  })

  expect(shelf).toEqual([
    {
      x: [50, 0],
      y: [50, 0],
      name: ['James', 0],
      color: [
        {
          r: [255, 0],
          g: [0, 0],
          b: [0, 0],
        },
        0,
      ]
    },
    0
  ])
})

test('Create local changes, single value to single value', () => {
  const shelf = createShelf(5)
  const shelf2 = createLocalChangesDiff(shelf, 8)
  expect(shelf2).toEqual([8, 1])
})

test('Create local changes, single value to object value', () => {
  const shelf = createShelf(5)
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50 })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0] }, 1])
})

test('Create local changes, object value to single value', () => {
  const shelf = createShelf({ x: 50, y: 50 })
  const shelf2 = createLocalChangesDiff(shelf, 5)
  expect(shelf2).toEqual([5, 1])
})

test('Create local changes, object value to object value', () => {
  const shelf = createShelf({ x: 50, y: 50 })
  const shelf2 = createLocalChangesDiff(shelf, { x: 100, y: 50 })
  expect(shelf2).toEqual([{ x: [100, 1], y: [50, 0] }, 0])
})

test('Create local changes, add object', () => {
  const shelf = createShelf({ x: 50, y: 50 })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, color: { r: 255, g: 0, b: 0 }})
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], color: [{ r: [255, 0], g: [0, 0], b: [0, 0] }, 0] }, 0])
})

test('Create local changes, remove object', () => {
  const shelf = createShelf({ x: 50, y: 50, color: { r: 255, g: 0, b: 0 } })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50 })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], color: [null, 1] }, 0])
})

test('Create local changes, object value add field', () => {
  const shelf = createShelf({ x: 50, y: 50 })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, z: 50 })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], z: [50, 0] }, 0])
})

test('Create local changes, object value remove field', () => {
  const shelf = createShelf({ x: 50, y: 50, z: 50 })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50 })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], z: [null, 1] }, 0])
})

test('Create local changes, nested object update field value', () => {
  const shelf = createShelf({ x: 50, y: 50, color: { r: 255, g: 0, b: 0 }})
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, color: { r: 0, g: 0, b: 255 }})
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], color: [{ r: [0, 1], g: [0, 0], b: [255, 1] }, 0] }, 0])
})

test('Create local changes, nested object add field value', () => {
  const shelf = createShelf({ x: 50, y: 50, color: { r: 255, g: 0, b: 0 }})
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, color: { r: 255, g: 0, b: 0, a: 1 }})
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], color: [{ r: [255, 0], g: [0, 0], b: [0, 0], a: [1, 0] }, 0] }, 0])
})

test('Create local changes, nested object remove field value', () => {
  const shelf = createShelf({ x: 50, y: 50, color: { r: 255, g: 0, b: 0, a: 1 }})
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, color: { r: 255, g: 0, b: 0 }})
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], color: [{ r: [255, 0], g: [0, 0], b: [0, 0], a: [null, 1] }, 0] }, 0])
})

test('Create local changes, nested object add object', () => {
  const shelf = createShelf({ x: 50, y: 50, colorMap: {} })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, colorMap: { shirt: {} } })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], colorMap: [{ shirt: [{}, 0] }, 0] }, 0])
})

test('Create local changes, nested object remove object', () => {
  const shelf = createShelf({ x: 50, y: 50, colorMap: { shirt: {} } })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 50, colorMap: {} })
  expect(shelf2).toEqual([{ x: [50, 0], y: [50, 0], colorMap: [{ shirt: [null, 1] }, 0] }, 0])
})

test('Create local changes, array', () => {
  const shelf = createShelf([0, 1, 2, 3, 4])
  const shelf2 = createLocalChangesDiff(shelf, [0, 2, 3])
  expect(shelf2).toEqual([[0, 2, 3], 1])
})

test('Create local changes, string', () => {
  const shelf = createShelf('Hello world')
  const shelf2 = createLocalChangesDiff(shelf, 'Hello world!')
  expect(shelf2).toEqual(['Hello world!', 1])
})

test('Create local changes, object with string field', () => {
  const shelf = createShelf({ x: 50, y: 100, name: 'James' })
  const shelf2 = createLocalChangesDiff(shelf, { x: 50, y: 100, name: 'Greg' })
  expect(shelf2).toEqual([{ x: [50, 0], y: [100, 0], name: ['Greg', 1] }, 0])
})

test('Get data from shelf, single value', () => {
  const shelf = [50, 4]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual(50)
})

test('Get data from shelf, object', () => {
  const shelf = [{ x: [50, 0], y: [100, 1] }, 3]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual({ x: 50, y: 100 })
})

test('Get data from shelf, array', () => {
  const shelf = [[25, 25], 3]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual([25, 25])
})

test('Get data from shelf, string', () => {
  const shelf = ['Hello world', 1]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual('Hello world')
})

test('Get data from shelf, object contains null fields', () => {
  const shelf = [{ x: [100, 0], y: [0, 0], z: [null, 1] }, 1]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual({ x: 100, y: 0 })
})

test('Get data from shelf, nested objects', () => {
  const shelf = [{ x: [100, 0], y: [50, 0], color: [{ r: [255, 0], g: [0, 0], b: [255, 0]}, 0] }]
  const shelfData = getDataFromShelf(shelf)
  expect(shelfData).toEqual({ x: 100, y: 50, color: { r: 255, g: 0, b: 255 } })
})

// Still needs tests for compareShelves, diffShelves and mergeShelves.
test('Get shelf type ranking object', () => {
  const value = { x: 50, y: 50 }
  const ranking = getShelfTypeRanking(value)
  expect(ranking).toEqual(SHELF_TYPE_RANKINGS.object)
})

test('Get shelf type ranking array', () => {
  const value = [0, 1, 0, 1, 0]
  const ranking = getShelfTypeRanking(value)
  expect(ranking).toEqual(SHELF_TYPE_RANKINGS.array)
})

test('Get shelf type ranking string', () => {
  const value = 'Hello world!'
  const ranking = getShelfTypeRanking(value)
  expect(ranking).toEqual(SHELF_TYPE_RANKINGS.string)
})

test('Get shelf type ranking number', () => {
  const value = 7
  const ranking = getShelfTypeRanking(value)
  expect(ranking).toEqual(SHELF_TYPE_RANKINGS.number)
})

test('Get shelf type ranking boolean false', () => {
  const value = false
  const ranking = getShelfTypeRanking(value)
  expect(ranking).toEqual(SHELF_TYPE_RANKINGS.boolean)
})

test('Get shelf type ranking boolean true', () => {
  const value = true
  const ranking = getShelfTypeRanking(value)
  expect(ranking).toEqual(SHELF_TYPE_RANKINGS.boolean)
})

test('Get shelf type ranking null', () => {
  const value = null
  const ranking = getShelfTypeRanking(value)
  expect(ranking).toEqual(SHELF_TYPE_RANKINGS.null)
})

// This can't be json stringified, so i'm not sure if other should just go unsupported.
test('Get shelf type ranking other', () => {
  const value = 9007199254740993n
  const ranking = getShelfTypeRanking(value)
  expect(ranking).toEqual(SHELF_TYPE_RANKINGS.other)
})

test('Compare two objects', () => {
  const value = {}
  const value2 = {}
  const order = compareValues(value, value2)
  expect(order).toEqual(0)
})

test('Compare object and array', () => {
  const value = {}
  const value2 = []
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare array and object', () => {
  const value = []
  const value2 = {}
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare array and array', () => {
  const value = []
  const value2 = []
  const order = compareValues(value, value2)
  expect(order).toEqual(0)
})

test('Compare object and string', () => {
  const value = {}
  const value2 = ''
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare string and object', () => {
  const value = ''
  const value2 = {}
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare string and string', () => {
  const value = ''
  const value2 = ''
  const order = compareValues(value, value2)
  expect(order).toEqual(0)
})

test('Compare array and string', () => {
  const value = []
  const value2 = ''
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare string and array', () => {
  const value = ''
  const value2 = []
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare object and number', () => {
  const value = {}
  const value2 = 0
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare number and object', () => {
  const value = 0
  const value2 = {}
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare number and number', () => {
  const value = 0
  const value2 = 0
  const order = compareValues(value, value2)
  expect(order).toEqual(0)
})

test('Compare array and number', () => {
  const value = []
  const value2 = 0
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare number and array', () => {
  const value = 0
  const value2 = []
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare string and number', () => {
  const value = ''
  const value2 = 0
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare number and string', () => {
  const value = 0
  const value2 = ''
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare object and boolean', () => {
  const value = {}
  const value2 = false
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare boolean and object', () => {
  const value = false
  const value2 = {}
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare boolean and boolean', () => {
  const value = false
  const value2 = false
  const order = compareValues(value, value2)
  expect(order).toEqual(0)
})

test('Compare array and boolean', () => {
  const value = []
  const value2 = false
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare boolean and array', () => {
  const value = false
  const value2 = []
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare string and boolean', () => {
  const value = ''
  const value2 = false
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare boolean and string', () => {
  const value = false
  const value2 = ''
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare number and boolean', () => {
  const value = 0
  const value2 = false
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare boolean and number', () => {
  const value = false
  const value2 = 0
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare object and null', () => {
  const value = {}
  const value2 = null
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare null and object', () => {
  const value = null
  const value2 = {}
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare null and null', () => {
  const value = null
  const value2 = null
  const order = compareValues(value, value2)
  expect(order).toEqual(0)
})

test('Compare array and null', () => {
  const value = []
  const value2 = null
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare null and array', () => {
  const value = null
  const value2 = []
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare string and null', () => {
  const value = ''
  const value2 = null
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare null and string', () => {
  const value = null
  const value2 = ''
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare number and null', () => {
  const value = 0
  const value2 = null
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare null and number', () => {
  const value = null
  const value2 = 0
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare boolean and null', () => {
  const value = false
  const value2 = null
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare null and boolean', () => {
  const value = null
  const value2 = false
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare string apple and pie', () => {
  const value = 'apple'
  const value2 = 'pie'
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare string pie and apple', () => {
  const value = 'pie'
  const value2 = 'apple'
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare number 2 and 5', () => {
  const value = 2
  const value2 = 5
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare number 5 and 2', () => {
  const value = 5
  const value2 = 2
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare boolean true and false', () => {
  const value = false
  const value2 = true
  const order = compareValues(value, value2)
  expect(order).toEqual(1)
})

test('Compare boolean false and true', () => {
  const value = true
  const value2 = false
  const order = compareValues(value, value2)
  expect(order).toEqual(-1)
})

test('Compare shelves, both null', () => {
  const shelf = null
  const shelf2 = null
  const order = compareShelves(shelf, shelf2)
  expect(order).toEqual(0)
})

test('Compare shelves, non null and null', () => {
  const shelf = [0, 0]
  const shelf2 = null
  const order = compareShelves(shelf, shelf2)
  expect(order).toEqual(1)
})

test('Compare shelves, null and non null', () => {
  const shelf = null
  const shelf2 = [0, 0]
  const order = compareShelves(shelf, shelf2)
  expect(order).toEqual(-1)
})

test('Compare shelves, version 0 and 1', () => {
  const shelf = [0, 1]
  const shelf2 = [5, 0]
  const order = compareShelves(shelf, shelf2)
  expect(order).toEqual(1)
})

test('Compare shelves, version 0 and 1', () => {
  const shelf = [0, 0]
  const shelf2 = [5, 1]
  const order = compareShelves(shelf, shelf2)
  expect(order).toEqual(-1)
})

test('Compare shelves, version 0 and 0', () => {
  const shelf = [{}, 0]
  const shelf2 = [{}, 0]
  const order = compareShelves(shelf, shelf2)
  expect(order).toEqual(0)
})

// Requires tests for diff and merge
