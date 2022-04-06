const OPERATIONS = {
  SET: 'set',
  PUSH: 'push',
  CLEAR: 'clear',
}

export const createOp = {
  set: (userId, value, sequence, version, sequencerVersion) => ({ type: OPERATIONS.SET, userId, value, sequence, version, sequencerVersion }),
  push: (userId, value, sequence, sequencerVersion) => ({ type: OPERATIONS.INSERT, userId, value, sequence, sequencerVersion }),
  clear: (sequencerVersion) => ({ type: OPERATIONS.CLEAR, sequencerVersion }),
}

export const createSequencer = (maxLength = -1) => {
  return {
    values: [],
    versions: [],
    sequences: [],
    userIds: [],
    sequencerVersion: 0,
    maxLength,
  }
}

export const pushValue = (sequencer, userId, value, sequence, sequencerVersion) => {
  if (sequencerVersion < sequencer.sequencerVersion) {
    return
  } else if (sequencerVersion > sequencer.sequencerVersion) {
    clearSequencer(sequencer, sequencerVersion)
  }

  const { values, versions, sequences, userIds, maxLength } = sequencer

  let index = sequences.findIndex(s => s >= sequence)
  if (index === -1) {
    values.push(value)
    versions.push(0)
    sequences.push(sequence)
    userIds.push(userId)
    return
  }
  while (index < sequences.length && sequences[index] <= sequence && userId < userIds[index]) {
    index++
  }
  values.splice(index, 0, value)
  versions.splice(index, 0, 0)
  sequences.splice(index, 0, sequence)
  userIds.splice(index, 0, userId)

  if (maxLength !== -1 && sequences.length > maxLength) {
    values.shift()
    versions.shift()
    sequences.shift()
    userIds.shift()
  }
}

const setValue = (sequencer, userId, value, sequence, version, sequencerVersion) => {
  if (sequencerVersion < sequencer.sequencerVersion) {
    return
  } else if (sequencerVersion > sequencer.sequencerVersion) {
    clearSequencer(sequencer, sequencerVersion)
  }
  const { values, versions, sequences, userIds } = sequencer
  const index = sequences.findIndex((s, i) => s === sequence && userIds[i] === userId)
  if (index !== -1) {
    // Swap this out to first test the type of each & then if both are the same type, test the userId's against each other.
    // The user Id thing isn't really possible unless I store another field. (Currently userId is the "creator Id".
    if (version > versions[index] || (version === versions[index] && JSON.stringify(value) < JSON.stringify(values[index]))) {
      values[index] = value
      versions[index] = version
    }
  }
}

export const clearSequencer = (sequencer, sequencerVersion) => {
  if (sequencer.sequencerVersion < sequencerVersion) {
    sequencer.values = []
    sequencer.versions = []
    sequencer.sequences = []
    sequencer.userIds = []
    sequencer.sequencerVersion = sequencerVersion
  }
}

export const applySequencerOp = (sequencer, op) => {
  if (op.type === OPERATIONS.SET) {
    setValue(sequencer, op.userId, op.value, op.sequence, op.version)
  } else if (op.type === OPERATIONS.PUSH) {
    pushValue(sequencer, op.userId, op.value, op.sequence)
  } else if (op.type === OPERATIONS.CLEAR) {
    clearSequencer(sequencer, op.sequencerVersion)
  }
}

export const applySequencerOps = (sequencer, ops) => {
  ops.forEach(op => {
    applySequencerOp(sequencer, op)
  })
}

// const [values, setAtIndex, push, clear] = useSequencer(key, maxLength)
