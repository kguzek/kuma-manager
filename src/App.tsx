import { useEffect, useRef } from "react"

import { AppHeader } from "@/components/layout/AppHeader"
import { AppFooter } from "@/components/layout/AppFooter"
import { StatusCard } from "@/components/layout/StatusCard"
import { AuthFlow } from "@/features/auth/components/AuthFlow"
import { DashboardPage } from "@/features/dashboard/components/DashboardPage"
import { CreateMonitorPage } from "@/features/monitors/components/CreateMonitorPage"
import { MonitorPage } from "@/features/monitors/components/MonitorPage"
import { MonitorsPage } from "@/features/monitors/components/MonitorsPage"
import { StatusPageDetailPage } from "@/features/status-pages/components/StatusPageDetailPage"
import { StatusPagesPage } from "@/features/status-pages/components/StatusPagesPage"
import { useAlertState } from "@/hooks/useAlertState"
import { useAppRoute } from "@/hooks/useAppRoute"
import { useKumaConnection } from "@/hooks/useKumaConnection"
import { useKumaMonitors } from "@/hooks/useKumaMonitors"
import { useKumaStatusPages } from "@/hooks/useKumaStatusPages"

export default function App() {
  const { route, navigate } = useAppRoute()
  const { statusMessage, errorMessage, pendingCount, setStatusMessage, setErrorMessage, setPendingCount, alertRef } = useAlertState()

  const {
    instances,
    setInstances,
    connectedInstances,
    setConnectedInstances,
    sessionState,
    clientsRef,
    configuredInstances,
    canRestoreSavedLogin,
    authenticateWithPassword,
    authenticateWithSavedTokens,
    logout,
  } = useKumaConnection(route, navigate, setStatusMessage, setErrorMessage)

  const {
    monitorRecords,
    differences,
    unmanagedMonitors,
    monitorGroups,
    monitorToStatusPages,
    refreshMonitors,
    syncFrom,
    applySuggestedTag,
    saveMonitorDetails,
    renameMonitorTag,
    createMonitor,
  } = useKumaMonitors(connectedInstances, setConnectedInstances, clientsRef, navigate, setStatusMessage, setErrorMessage, setPendingCount)

  const {
    statusPageRecords,
    statusPageDifferences,
    refreshStatusPages,
    addPublicGroupToInstance,
    renamePublicGroupOnInstance,
    deletePublicGroupFromInstance,
    saveStatusPagePublicGroups,
    saveStatusPageDetails,
    createStatusPage,
    deleteStatusPageFromAll,
  } = useKumaStatusPages(
    connectedInstances,
    setConnectedInstances,
    clientsRef,
    navigate,
    setStatusMessage,
    setErrorMessage,
    setPendingCount,
  )

  const attemptedSavedLoginRef = useRef(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: authenticateWithSavedTokens intentionally excluded to avoid infinite loops
  useEffect(() => {
    if (!canRestoreSavedLogin || attemptedSavedLoginRef.current || sessionState !== "configuring") return
    attemptedSavedLoginRef.current = true
    if (!route.startsWith("/monitors/") && route !== "/login" && !route.startsWith("/status-pages/")) navigate("/login")
    void authenticateWithSavedTokens()
  }, [canRestoreSavedLogin, sessionState, route, navigate])

  const isLoginPage = route === "/login" || (sessionState === "authenticating" && configuredInstances.length > 0)
  const isDetailPage = route.startsWith("/monitors/") || route.startsWith("/status-pages/")
  const alertWidthClass =
    sessionState !== "authenticated"
      ? isLoginPage
        ? "mx-auto w-full max-w-md"
        : "mx-auto w-full max-w-5xl"
      : isDetailPage
        ? "mx-auto w-full max-w-3xl"
        : "w-full"
  const statusTone = sessionState === "authenticating" || pendingCount > 0 ? "loading" : "success"

  return (
    <main className="dot-grid-bg flex min-h-svh flex-col px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
        <AppHeader sessionState={sessionState} onLogout={logout} onRefresh={refreshMonitors} />
        <div className="flex flex-1 flex-col gap-6">
          {(statusMessage || errorMessage) && (
            <div ref={alertRef} className={`${alertWidthClass} grid gap-3`}>
              {statusMessage && !errorMessage && (
                <StatusCard message={statusMessage} tone={statusTone} onDismiss={() => setStatusMessage(null)} />
              )}
              {errorMessage && <StatusCard message={errorMessage} tone="error" onDismiss={() => setErrorMessage(null)} />}
            </div>
          )}
          {sessionState !== "authenticated" ? (
            <AuthFlow
              route={route === "/instances" ? "/instances" : "/login"}
              instances={instances}
              authenticating={sessionState === "authenticating"}
              onInstancesChange={setInstances}
              onNavigate={navigate}
              onPasswordLogin={authenticateWithPassword}
            />
          ) : route === "/monitors/new" ? (
            <CreateMonitorPage
              monitorGroups={monitorGroups}
              onBack={() => navigate("/monitors")}
              onNavigate={navigate}
              onCreate={createMonitor}
            />
          ) : route.startsWith("/monitors/") && route !== "/monitors" ? (
            <MonitorPage
              route={route}
              connectedInstances={connectedInstances}
              monitorRecords={monitorRecords}
              monitorGroups={monitorGroups}
              onBack={() => navigate("/monitors")}
              onNavigate={navigate}
              onSave={saveMonitorDetails}
              onRenameTag={renameMonitorTag}
            />
          ) : route === "/monitors" ? (
            <MonitorsPage
              connectedInstances={connectedInstances}
              differences={differences}
              monitorRecords={monitorRecords}
              unmanagedMonitors={unmanagedMonitors}
              monitorGroups={monitorGroups}
              monitorToStatusPages={monitorToStatusPages}
              onSyncFrom={syncFrom}
              onApplySuggestedTag={applySuggestedTag}
              onRefresh={refreshMonitors}
              onNavigate={navigate}
            />
          ) : route.startsWith("/status-pages/") && route !== "/status-pages" ? (
            <StatusPageDetailPage
              route={route}
              connectedInstances={connectedInstances}
              statusPageRecords={statusPageRecords}
              onBack={() => navigate("/status-pages")}
              onNavigate={navigate}
              onSave={saveStatusPageDetails}
              onDelete={deleteStatusPageFromAll}
              onAddPublicGroup={addPublicGroupToInstance}
              onRenamePublicGroup={renamePublicGroupOnInstance}
              onDeletePublicGroup={deletePublicGroupFromInstance}
              onSaveStatusPagePublicGroups={saveStatusPagePublicGroups}
            />
          ) : route === "/status-pages" ? (
            <StatusPagesPage
              connectedInstances={connectedInstances}
              statusPageRecords={statusPageRecords}
              statusPageDifferences={statusPageDifferences}
              onRefresh={refreshStatusPages}
              onNavigate={navigate}
              onCreate={createStatusPage}
            />
          ) : (
            <DashboardPage
              connectedInstances={connectedInstances}
              differences={differences}
              statusPageDifferences={statusPageDifferences}
              monitorRecords={monitorRecords}
              statusPageRecords={statusPageRecords}
              onNavigate={navigate}
            />
          )}
        </div>
        <AppFooter />
      </div>
    </main>
  )
}
