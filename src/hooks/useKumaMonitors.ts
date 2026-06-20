import { useMemo } from "react"

import type { KumaApiClient } from "@/api/kuma/client"
import {
  buildMonitorRecords,
  diffMonitorRecord,
  getMonitorGroupViews,
  getUnmanagedMonitors,
  INSTANCE_LOCAL_FIELDS,
  prepareMonitorForCreate,
  prepareMonitorForEdit,
} from "@/features/monitors/utils/monitor-sync"
import type { AppRoute, ConnectedKumaInstance, KumaMonitor, MonitorDetailsValues, MonitorDifference } from "@/types"
import { enrichInstancePages } from "@/utils/kuma"

export function useKumaMonitors(
  connectedInstances: ConnectedKumaInstance[],
  setConnectedInstances: (instances: ConnectedKumaInstance[] | ((prev: ConnectedKumaInstance[]) => ConnectedKumaInstance[])) => void,
  clientsRef: React.MutableRefObject<Record<string, KumaApiClient>>,
  navigate: (route: AppRoute) => void,
  setStatusMessage: (msg: string | null) => void,
  setErrorMessage: (msg: string | null) => void,
  setPendingCount: (count: number | ((prev: number) => number)) => void,
) {
  const monitorRecords = useMemo(() => buildMonitorRecords(connectedInstances), [connectedInstances])

  const differences = useMemo(
    () =>
      monitorRecords
        .map((record) => diffMonitorRecord(record, connectedInstances))
        .filter((diff): diff is MonitorDifference => Boolean(diff)),
    [connectedInstances, monitorRecords],
  )

  const unmanagedMonitors = useMemo(() => getUnmanagedMonitors(connectedInstances), [connectedInstances])

  const monitorGroups = useMemo(() => getMonitorGroupViews(connectedInstances), [connectedInstances])

  const monitorToStatusPages = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const instance of connectedInstances) {
      for (const page of instance.statusPages ?? []) {
        const slug = page.slug || `page-${page.id}`
        for (const group of page.publicGroupList ?? []) {
          for (const pm of group.monitorList ?? []) {
            for (const record of monitorRecords) {
              const monitor = record.monitorsByInstance[instance.config.id]
              if (monitor && monitor.id === pm.id) {
                const existing = map.get(record.tag) ?? []
                if (!existing.includes(slug)) {
                  map.set(record.tag, [...existing, slug])
                }
              }
            }
          }
        }
      }
    }
    return map
  }, [connectedInstances, monitorRecords])

  function instanceName(instanceId: string) {
    return connectedInstances.find((instance) => instance.config.id === instanceId)?.config.name ?? instanceId
  }

  async function refreshMonitors() {
    setStatusMessage("Refreshing data...")
    setErrorMessage(null)
    setPendingCount((c) => c + 1)

    try {
      const refreshed = await Promise.all(
        connectedInstances.map(async (instance) => {
          const client = clientsRef.current[instance.config.id]
          const [monitors, statusPages] = await Promise.all([client.getMonitors(), client.getStatusPages()])
          const enrichedPages = await enrichInstancePages(statusPages, client)
          return { ...instance, monitors, statusPages: enrichedPages }
        }),
      )
      setConnectedInstances(refreshed)
      setStatusMessage("Data refreshed.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Refresh failed")
    } finally {
      setPendingCount((c) => c - 1)
    }
  }

  async function syncFrom(sourceInstanceId: string, tag: string) {
    const record = monitorRecords.find((entry) => entry.tag === tag)
    const source = record?.monitorsByInstance[sourceInstanceId]
    if (!record || !source) return

    setStatusMessage(`Syncing ${tag} from ${instanceName(sourceInstanceId)}...`)
    setErrorMessage(null)
    setPendingCount((c) => c + 1)

    try {
      for (const targetInstance of connectedInstances) {
        if (targetInstance.config.id === sourceInstanceId) continue
        const client = clientsRef.current[targetInstance.config.id]
        const target = record.monitorsByInstance[targetInstance.config.id]
        const editData = target ? prepareMonitorForEdit(source, target) : prepareMonitorForCreate(source)
        if (editData.parent !== undefined && editData.parent !== null) {
          const parentExists = targetInstance.monitors.some((m) => m.id === editData.parent)
          if (!parentExists) editData.parent = null
        }
        const response = target ? await client.editMonitor(editData as KumaMonitor) : await client.addMonitor(editData)
        if (!response.ok) throw new Error(`${targetInstance.config.name}: ${response.msg ?? "sync failed"}`)
      }
      await refreshMonitors()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sync failed")
    } finally {
      setPendingCount((c) => c - 1)
    }
  }

  async function applySuggestedTag(instanceId: string, monitor: KumaMonitor, tag: string) {
    const client = clientsRef.current[instanceId]
    setStatusMessage(`Applying ${tag} to ${monitor.name}...`)
    setErrorMessage(null)

    try {
      const response = await client.addMonitorTag(monitor.id, tag)
      if (!response.ok) throw new Error(response.msg ?? "Failed to apply tag")
      setConnectedInstances((current) =>
        current.map((instance) => {
          if (instance.config.id !== instanceId) return instance

          return {
            ...instance,
            monitors: instance.monitors.map((entry) =>
              entry.id === monitor.id
                ? {
                    ...entry,
                    tags: [...(entry.tags ?? []), { name: tag, value: null, color: "#2563eb" }],
                  }
                : entry,
            ),
          }
        }),
      )
      await refreshMonitors()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to apply tag")
    }
  }

  async function saveMonitorDetails(tag: string, values: MonitorDetailsValues, groupName?: string) {
    const record = monitorRecords.find((entry) => entry.tag === tag)
    if (!record) return

    setStatusMessage(`Saving ${tag}...`)
    setErrorMessage(null)
    setPendingCount((c) => c + 1)

    const errors: string[] = []

    try {
      for (const instance of connectedInstances) {
        const monitor = record.monitorsByInstance[instance.config.id]
        if (!monitor) continue

        const instanceValues: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(values)) {
          if (INSTANCE_LOCAL_FIELDS.has(key)) continue
          instanceValues[key] = val
        }
        if (groupName !== undefined) {
          const group = monitorGroups.find((g) => g.instance.config.id === instance.config.id && g.group.name === groupName)
          instanceValues.parent = group?.group.id ?? null
        } else {
          instanceValues.parent = null
        }

        const payload = { ...monitor, ...instanceValues }

        const response = await clientsRef.current[instance.config.id].editMonitor(payload as KumaMonitor)

        if (!response.ok) {
          errors.push(`${instance.config.name}: ${response.msg ?? "save failed"}`)
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "))
      }

      setConnectedInstances((current) =>
        current.map((instance) => ({
          ...instance,
          monitors: instance.monitors.map((monitor) => {
            const target = record.monitorsByInstance[instance.config.id]
            if (!target || monitor.id !== target.id) return monitor

            return { ...monitor, ...values }
          }),
        })),
      )
      setStatusMessage(`Saved ${tag} across all available instances.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed")
    } finally {
      setPendingCount((c) => c - 1)
    }
  }

  async function renameMonitorTag(oldTag: string, newTag: string) {
    const record = monitorRecords.find((entry) => entry.tag === oldTag)
    if (!record) return

    setStatusMessage(`Renaming ${oldTag}...`)
    setErrorMessage(null)
    setPendingCount((c) => c + 1)

    try {
      for (const instance of connectedInstances) {
        const monitor = record.monitorsByInstance[instance.config.id]
        if (!monitor) continue

        const response = await clientsRef.current[instance.config.id].replaceMonitorTag(monitor, oldTag, newTag)
        if (!response.ok) throw new Error(`${instance.config.name}: ${response.msg ?? "tag rename failed"}`)
      }

      setConnectedInstances((current) =>
        current.map((instance) => ({
          ...instance,
          monitors: instance.monitors.map((monitor) => {
            const target = record.monitorsByInstance[instance.config.id]
            if (!target || monitor.id !== target.id) return monitor

            return {
              ...monitor,
              tags: [...(monitor.tags ?? []).filter((tag) => tag.name !== oldTag), { name: newTag, value: null, color: "#2563eb" }],
            }
          }),
        })),
      )
      setStatusMessage(`Renamed ${oldTag} to ${newTag}.`)
      navigate(`/monitors/${encodeURIComponent(newTag.replace(/^monitor:/, ""))}`)
      await refreshMonitors()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Tag rename failed")
    } finally {
      setPendingCount((c) => c - 1)
    }
  }

  async function createMonitor(tag: string, values: MonitorDetailsValues, groupName?: string) {
    setStatusMessage(`Creating ${tag} on all instances...`)
    setErrorMessage(null)
    setPendingCount((c) => c + 1)

    try {
      for (const instance of connectedInstances) {
        const client = clientsRef.current[instance.config.id]

        const instanceValues: MonitorDetailsValues = { ...values }
        if (groupName) {
          const group = monitorGroups.find((g) => g.instance.config.id === instance.config.id && g.group.name === groupName)
          if (group) instanceValues.parent = group.group.id
        }

        const response = await client.addMonitor(instanceValues)
        if (!response.ok) throw new Error(`${instance.config.name}: ${response.msg ?? "create failed"}`)
        if (response.monitorID) {
          const tagResponse = await client.addMonitorTag(response.monitorID, tag)
          if (!tagResponse.ok) throw new Error(`${instance.config.name}: ${tagResponse.msg ?? "tag failed"}`)
        }
      }

      await refreshMonitors()
      navigate(`/monitors/${encodeURIComponent(tag.replace(/^monitor:/, ""))}`)
      setStatusMessage(`Created ${tag} successfully.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Create failed")
    } finally {
      setPendingCount((c) => c - 1)
    }
  }

  return {
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
  }
}
