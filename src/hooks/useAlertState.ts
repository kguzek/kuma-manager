import { useEffect, useRef, useState } from "react"

export function useAlertState() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const alertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (errorMessage && alertRef.current) {
      alertRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
      setStatusMessage(null)
    }
  }, [errorMessage])

  return {
    statusMessage,
    errorMessage,
    pendingCount,
    setStatusMessage,
    setErrorMessage,
    setPendingCount,
    alertRef,
  }
}
