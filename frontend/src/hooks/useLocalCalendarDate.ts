import { useEffect, useState } from "react"
import { localCalendarDate } from "../lib/agreements"

export default function useLocalCalendarDate(): string {
  const [today, setToday] = useState(localCalendarDate)
  useEffect(() => {
    let timer: number
    function update() {
      const now = new Date()
      setToday(localCalendarDate(now))
      window.clearTimeout(timer)
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      )
      timer = window.setTimeout(update, midnight.getTime() - now.getTime() + 50)
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") update()
    }
    update()
    window.addEventListener("focus", update)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("focus", update)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])
  return today
}
