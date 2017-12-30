module.exports = throttle

let nextId = 1

// report throttle
function throttle ({reportFunc, minDelay = 1000, maxDelay = 5000, nowFunc}) {
  const now = nowFunc || (() => Date.now())
  const id = nextId++

  let notifyCount = 0
  let lastReport = 0
  let timerRef = null

  function setTimer (delayCap) {
    const delay = delayCap - Math.min(delayCap, now() - lastReport)
    timerRef = setTimeout(tryReport, delay)
  }

  function resetTimer () {
    if (timerRef) {
      clearTimeout(timerRef)
    }

    if (notifyCount > 0) {
      setTimer(minDelay)
    } else if (maxDelay && maxDelay > 0) {
      setTimer(Math.max(maxDelay, minDelay))
    }
  }

  function tryReport () {
    if (now() - lastReport >= minDelay) {
      lastReport = now()
      notifyCount = 0

      if (reportFunc) {
        reportFunc()
      }
    }

    resetTimer()
  }

  function notify (newReportFunc) {
    if (typeof newReportFunc === 'function') {
      reportFunc = newReportFunc
    }

    notifyCount++
    tryReport()
  }

  resetTimer()

  return notify
}
