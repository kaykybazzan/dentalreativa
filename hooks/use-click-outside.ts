import { useEffect, RefObject } from "react"

export function useClickOutside(
  target: string | RefObject<HTMLElement | null>,
  callback: () => void
) {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const targetElement = e.target as HTMLElement

      if (typeof target === "string") {
        // Handle CSS selector
        const element = document.querySelector(target)
        if (element && !element.contains(targetElement)) {
          callback()
        }
      } else if (target.current) {
        // Handle ref
        if (!target.current.contains(targetElement)) {
          callback()
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [target, callback])
}
