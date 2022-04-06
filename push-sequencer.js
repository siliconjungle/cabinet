export const createPushSequencer = (maxLength = -1) => {
  return {
    values: [],
    versions: [],
    sequences: [],
    userIds: [],
    maxLength,
  }
}

export const pushToSequencer = (sequencer, userId, value, sequence) => {
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

export const setSequencerValue = (sequencer, userId, value, sequence, version) => {
  const { values, versions, sequences, userIds } = sequencer
  const index = sequences.findIndex((s, i) => s === sequence && userIds[i] === userId)
  if (index !== -1) {
    if (version > versions[index] || (version === versions[index] && JSON.stringify(value) < JSON.stringify(values[index]))) {
      values[index] = value
      versions[index] = version
    }
  }
}
