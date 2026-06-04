export function getWeakAreas(topicPerformance, { minAttempts = 3, maxAccuracy = 70, limit = 5 } = {}) {
  return topicPerformance
    .filter((row) => row.completed >= minAttempts && row.accuracy < maxAccuracy)
    .sort((a, b) => a.accuracy - b.accuracy || b.completed - a.completed)
    .slice(0, limit)
    .map(({ topic, accuracy, completed }) => ({ topic, accuracy, completed }))
}
