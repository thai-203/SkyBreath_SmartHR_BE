export function getChangedFields(before = {}, after = {}) {
  const changed = []

  const keys = new Set([
    ...Object.keys(before),
    ...Object.keys(after)
  ])

  for (const key of keys) {
    const beforeVal = before[key]
    const afterVal = after[key]

    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changed.push(key)
    }
  }

  return changed
}