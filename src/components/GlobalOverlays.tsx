import { Modal } from '@/components/ui/Modal'
import { CommandPalette } from '@/components/CommandPalette'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import { QuickAddTask } from '@/components/tasks/QuickAddTask'
import { useGlobalHotkeys } from '@/hooks/useGlobalHotkeys'
import { useMenuBridge } from '@/hooks/useMenuBridge'
import { useUiStore } from '@/stores/uiStore'
import { useSettings } from '@/lib/api/settings'
import { KEYBINDING_LABEL, type KeybindingAction } from '@/lib/settings'
import { prettyBinding } from '@/lib/utils/keybinding'

/** Hosts the app-level overlays driven by uiStore.overlay + the global hotkeys. */
export function GlobalOverlays() {
  useGlobalHotkeys()
  useMenuBridge()
  const overlay = useUiStore((s) => s.overlay)
  const setOverlay = useUiStore((s) => s.setOverlay)
  const { keybindings } = useSettings()
  const close = () => setOverlay('none')

  return (
    <>
      <CommandPalette />

      <ProjectFormModal open={overlay === 'newProject'} onClose={close} />

      <Modal open={overlay === 'newTask'} onClose={close} title="New task" width="md">
        <p className="mb-2 text-xs text-[--color-text-muted]">
          Pick a project, type a title, press Enter.
        </p>
        <QuickAddTask onCreated={close} />
      </Modal>

      <Modal open={overlay === 'shortcuts'} onClose={close} title="Keyboard shortcuts" width="sm">
        <ul className="space-y-2 text-sm">
          {(Object.keys(KEYBINDING_LABEL) as KeybindingAction[]).map((a) => (
            <li key={a} className="flex items-center justify-between gap-4">
              <span className="text-[--color-text-muted]">{KEYBINDING_LABEL[a]}</span>
              <kbd className="rounded border border-[--color-border] bg-[--color-surface-2] px-1.5 py-0.5 text-xs">
                {prettyBinding(keybindings[a])}
              </kbd>
            </li>
          ))}
          <li className="flex items-center justify-between gap-4">
            <span className="text-[--color-text-muted]">Close a dialog</span>
            <kbd className="rounded border border-[--color-border] bg-[--color-surface-2] px-1.5 py-0.5 text-xs">
              Esc
            </kbd>
          </li>
          <li className="pt-1 text-xs text-[--color-text-subtle]">Rebind these in Settings → Keyboard.</li>
        </ul>
      </Modal>
    </>
  )
}
