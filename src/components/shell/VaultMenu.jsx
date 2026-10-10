import { Check, FolderOpen, FolderSearch, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Menu } from "@/components/composed/Menu";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import { useVault } from "@/features/Settings/useVault";
import { vaultName } from "@/lib/vault";
import shellStyles from "./MaiaShell.module.css";
import styles from "./VaultMenu.module.css";

const VaultOption = ({ path, isCurrent, ...props }) => (
  <Menu.Item className={styles.option} aria-current={isCurrent ? "true" : undefined} title={path} {...props}>
    <FolderOpen size={16} strokeWidth={1.75} aria-hidden="true" />
    <span className={styles.text}>
      <span className={styles.name}>{vaultName(path)}</span>
      <span className={styles.path}>{path}</span>
    </span>
    {isCurrent && <Check className={styles.check} size={16} strokeWidth={1.75} aria-hidden="true" />}
  </Menu.Item>
);

/**
 * Bottom of the rail: shows the vault MAIA is working in and switches it.
 * Desktop only. The web build keeps notes in the browser, so there is nothing
 * to choose and the button is not rendered.
 */
export const VaultMenu = ({ onOpenVaultSettings }) => {
  const { isDesktop, path, recents, isSwitching, switchTo, pickAndSwitch } = useVault();
  if (!isDesktop) return null;

  // A failed switch explains itself in the Vault section of settings.
  const handleSwitch = async (next) => {
    const isDone = await switchTo(next);
    if (isDone) toast.success(`Switched to ${vaultName(next)}.`);
    else onOpenVaultSettings?.();
  };

  const handlePick = async () => {
    const result = await pickAndSwitch();
    if (result === null) return;
    if (result) toast.success("Vault switched.");
    else onOpenVaultSettings?.();
  };

  const name = path ? vaultName(path) : "none";

  return (
    <Menu.Root>
      <Tooltip content={path ?? "No vault chosen"} side="right">
        <Menu.Trigger
          className={shellStyles.railButton}
          aria-label={`Vault: ${name}`}
          aria-busy={isSwitching || undefined}
          disabled={isSwitching}
        >
          <FolderOpen size={20} strokeWidth={1.75} aria-hidden="true" />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Content side="right" align="end" sideOffset={8} className={styles.popup}>
        {path && (
          <Menu.Group>
            <Menu.Label>Current vault</Menu.Label>
            <VaultOption path={path} isCurrent />
          </Menu.Group>
        )}
        {recents.length > 0 && (
          <Menu.Group>
            <Menu.Label>Recent vaults</Menu.Label>
            {recents.map((recent) => (
              <VaultOption key={recent} path={recent} onClick={() => handleSwitch(recent)} />
            ))}
          </Menu.Group>
        )}
        <Menu.Separator />
        <Menu.Item onClick={handlePick}>
          <FolderSearch size={16} strokeWidth={1.75} aria-hidden="true" />
          Open another folder…
        </Menu.Item>
        <Menu.Item onClick={onOpenVaultSettings}>
          <Settings2 size={16} strokeWidth={1.75} aria-hidden="true" />
          Manage vaults in settings
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
};
