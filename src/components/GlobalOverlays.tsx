import { Modal } from '@/components/ui/Modal'
import { Kbd } from '@/components/ui/Kbd'
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
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">
          Pick a project, type a title, press Enter.
        </p>
        <QuickAddTask onCreated={close} />
      </Modal>

      <Modal open={overlay === 'shortcuts'} onClose={close} title="Keyboard shortcuts" width="sm">
        <ul className="text-sm">
          {(Object.keys(KEYBINDING_LABEL) as KeybindingAction[]).map((a) => (
            <li
              key={a}
              className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-2.5 last:border-b-0"
            >
              <span className="text-[var(--color-text-muted)]">{KEYBINDING_LABEL[a]}</span>
              <Kbd>{prettyBinding(keybindings[a])}</Kbd>
            </li>
          ))}
          <li className="flex items-center justify-between gap-4 py-2.5">
            <span className="text-[var(--color-text-muted)]">Close a dialog</span>
            <Kbd>Esc</Kbd>
          </li>
        </ul>
        <p className="mt-3 text-xs text-[var(--color-text-subtle)]">
          Rebind these in Settings → Keyboard.
        </p>
      </Modal>
    </>
  )
}
