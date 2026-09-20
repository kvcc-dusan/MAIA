import * as React from "react";
import { Surface } from "@/components/composed/Surface";
import { AppDialog } from "@/components/composed/AppDialog";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { PromptDialog } from "@/components/composed/PromptDialog";
import { SidePanel } from "@/components/composed/SidePanel";
import { Menu, MenuDangerItem, ContextDangerItem } from "@/components/composed/Menu";
import { IconButton } from "@/components/composed/IconButton";
import { Field } from "@/components/composed/Field";
import { PageHeader } from "@/components/composed/PageHeader";
import { EmptyState } from "@/components/composed/EmptyState";
import { ErrorState } from "@/components/composed/ErrorState";
import { StatusDot, PriorityChip } from "@/components/composed/StatusDot";
import { SectionCard } from "@/components/composed/SectionCard";
import { SectionLabel, CountPill } from "@/components/composed/SectionBits";
import { Widget } from "@/components/composed/Widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, Settings, Folder } from "lucide-react";

/**
 * Dev-only component gallery — open with ?ui=gallery.
 *
 * This is the visual baseline for the design system: every shared component in
 * every state, on one page, so a regression shows up in one screenshot instead
 * of being hunted across six pages and thirty modals.
 */

function Section({ title, note, children }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <Surface inset="lg" radius="lg" className="flex flex-wrap items-start gap-4">
        {children}
      </Surface>
    </section>
  );
}

export default function Gallery() {
  const [dialog, setDialog] = React.useState(null);

  return (
    <TooltipProvider>
      <div className="h-full overflow-y-auto bg-background text-foreground">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-page py-12">
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-medium">Component gallery</h1>
            <p className="text-sm text-muted-foreground">
              Dev only. Every shared surface in every state — the baseline for visual regressions.
            </p>
          </header>

          <Section title="Surface" note="Replaces 19 hand-written glass class strings.">
            {["panel", "glass", "well", "rail"].map((v) => (
              <Surface key={v} variant={v} inset="md" radius="md" className="w-40">
                <p className="text-sm font-medium">{v}</p>
                <p className="text-xs text-muted-foreground">elevation ramp</p>
              </Surface>
            ))}
            {["ambient", "raised", "overlay"].map((e) => (
              <Surface key={e} elevation={e} inset="md" radius="md" className="w-40">
                <p className="text-sm font-medium">shadow: {e}</p>
              </Surface>
            ))}
          </Section>

          <Section title="Button" note="base-luma variants and sizes.">
            {["default", "secondary", "outline", "ghost", "destructive", "link"].map((v) => (
              <Button key={v} variant={v}>{v}</Button>
            ))}
            <Separator orientation="vertical" className="h-9" />
            {["xs", "sm", "default", "lg"].map((s) => (
              <Button key={s} size={s}>{s}</Button>
            ))}
            <Button disabled>disabled</Button>
          </Section>

          <Section title="IconButton" note="Label is required — it feeds both the a11y name and the tooltip.">
            <IconButton label="Add item" icon={Plus} />
            <IconButton label="Edit" icon={Pencil} variant="outline" />
            <IconButton label="Settings" icon={Settings} variant="secondary" />
            <IconButton label="Delete" icon={Trash2} variant="destructive" />
            <IconButton label="No tooltip" icon={Plus} tooltip={false} />
          </Section>

          <Section title="Form controls" note="Including the invalid state — MAIA had no validation display at all before.">
            <div className="flex w-64 flex-col gap-2">
              <Label htmlFor="g-input">Label</Label>
              <Input id="g-input" placeholder="Placeholder" />
            </div>
            <div className="flex w-64 flex-col gap-2">
              <Label htmlFor="g-invalid">Invalid</Label>
              <Input id="g-invalid" aria-invalid defaultValue="bad value" />
              <p className="text-xs text-destructive" role="alert">This field has an error.</p>
            </div>
            <div className="flex w-64 flex-col gap-2">
              <Label htmlFor="g-ta">Textarea</Label>
              <Textarea id="g-ta" placeholder="Longer text…" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="g-cb" defaultChecked />
              <Label htmlFor="g-cb">Checkbox</Label>
            </div>
            <div className="flex w-56 flex-col gap-2">
              <Label>Select</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Option A</SelectItem>
                  <SelectItem value="b">Option B</SelectItem>
                  <SelectItem value="c">Option C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-64 flex-col gap-2">
              <Label>Disabled</Label>
              <Input disabled placeholder="Disabled" />
            </div>
          </Section>

          <Section title="Field" note="Owns label association, aria-invalid and aria-describedby so pages can't drift.">
            <Field label="Title" className="w-64">
              <Input placeholder="Weekly review" />
            </Field>
            <Field label="Stakes" hint="How much rides on this call?" className="w-64">
              <Input placeholder="High" />
            </Field>
            <Field label="Title" error="Title can't be empty." required className="w-64">
              <Input defaultValue="" />
            </Field>
            <Field label="Notes" className="w-64">
              <Textarea placeholder="Optional context…" />
            </Field>
          </Section>

          <Section title="PageHeader" note="NotesPage and LedgerPage hand-wrote this with identical class strings.">
            <div className="w-full">
              <PageHeader
                eyebrow="Codex"
                count={128}
                actions={
                  <>
                    <Button size="sm">New note</Button>
                    <IconButton label="Settings" icon={Settings} />
                  </>
                }
              />
            </div>
          </Section>

          <Section title="Opus section card" note="Extracted class-for-class from KnowledgePanel — the design-reference card. All four depth layers (translucency, blur, hairline border, deep shadow) or it reads cheap.">
            <div className="w-full grid gap-4 md:grid-cols-2">
              <SectionCard
                icon={Folder}
                title="Nodes"
                count={7}
                action={<IconButton label="Toggle view" icon={Pencil} size="icon-xs" />}
                className="min-h-40"
              >
                <p className="text-xs text-subtle-foreground">
                  Body is unopinionated — size it with bodyClassName / bodyStyle.
                </p>
              </SectionCard>
              <SectionCard
                title="Uplinks"
                count={2}
                className="min-h-40"
              >
                <p className="text-xs text-subtle-foreground">Icon and count are optional.</p>
              </SectionCard>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SectionLabel>Codex</SectionLabel>
              <SectionLabel as="h3">Execution</SectionLabel>
              <CountPill>128</CountPill>
              <span className="text-xs text-muted-foreground">
                The eyebrow and the count pill — the two smallest atoms of the vocabulary.
              </span>
            </div>
          </Section>

          <Section title="Widget shell" note="The one dashboard widget chrome — title, trailing actions, footer; edit-mode controls live inside the shell.">
            <div className="w-full grid gap-4 md:grid-cols-2">
              <Widget
                title="Momentum"
                className="min-h-36"
                footer={<span className="text-xs uppercase tracking-widest text-subtle-foreground">Entries 12</span>}
              >
                <p className="text-sm text-muted-foreground">Body content, inside the error boundary.</p>
              </Widget>
              <Widget
                title="Capture"
                className="min-h-36"
                trailing={<IconButton label="Add entry" icon={Plus} size="icon-xs" />}
              >
                <p className="text-sm text-muted-foreground">Trailing actions render when not editing.</p>
              </Widget>
            </div>
          </Section>

          <Section title="Status & priority" note="Replaces three copies of getPriorityColor returning raw hex.">
            <div className="flex items-center gap-3">
              {["p1", "p2", "p3"].map((p) => <StatusDot key={p} tone={p} />)}
              {["success", "warning", "danger", "info", "intel", "muted"].map((t) => (
                <StatusDot key={t} tone={t} />
              ))}
              <StatusDot tone="success" glow pulse />
            </div>
            <div className="flex items-center gap-2">
              {["p1", "p2", "p3"].map((p) => <PriorityChip key={p} priority={p} />)}
            </div>
          </Section>

          <Section title="Empty & error states" note="~24 empty states existed, each worded and styled differently.">
            <div className="w-64">
              <EmptyState icon={Plus} title="No notes found" />
            </div>
            <div className="w-72">
              <EmptyState
                size="page"
                icon={Trash2}
                title="No decisions recorded"
                description="Log a decision to start building your calibration record."
                action={<Button size="sm">Log decision</Button>}
              />
            </div>
            <div className="w-72">
              <ErrorState message="Cannot read properties of undefined" onRetry={() => toast("Retried")} />
            </div>
          </Section>

          <Section title="Overlays" note="All get focus trap, scroll lock, Escape and role=dialog from Base UI.">
            <Button onClick={() => setDialog("dialog")}>AppDialog</Button>
            <Button onClick={() => setDialog("confirm")} variant="destructive">ConfirmDialog</Button>
            <Button onClick={() => setDialog("prompt")} variant="secondary">PromptDialog</Button>
            <Button onClick={() => setDialog("panel")} variant="outline">SidePanel</Button>
            <Popover>
              <PopoverTrigger render={<Button variant="outline">Popover</Button>} />
              <PopoverContent className="w-64">
                <p className="text-sm">Popover content, positioned by Base UI.</p>
              </PopoverContent>
            </Popover>
          </Section>

          <Section title="Menus" note="Replaces four separate context-menu implementations.">
            <Menu.Root>
              <Menu.Trigger render={<Button variant="outline">Dropdown</Button>} />
              <Menu.Content>
                <Menu.Label>Actions</Menu.Label>
                <Menu.Item>Pin</Menu.Item>
                <Menu.Item>Rename</Menu.Item>
                <Menu.Sub>
                  <Menu.SubTrigger>Assign to project</Menu.SubTrigger>
                  <Menu.SubContent>
                    <Menu.Item>Portals 2.0</Menu.Item>
                    <Menu.Item>AI Atlas</Menu.Item>
                  </Menu.SubContent>
                </Menu.Sub>
                <Menu.Separator />
                <MenuDangerItem>Delete</MenuDangerItem>
              </Menu.Content>
            </Menu.Root>

            <Menu.Context>
              <Menu.ContextTrigger
                render={
                  <Surface variant="well" inset="md" radius="md" className="w-52 select-none">
                    <p className="text-sm">Right-click me</p>
                  </Surface>
                }
              />
              <Menu.ContextContent>
                <Menu.ContextItem>Pin</Menu.ContextItem>
                <Menu.ContextItem>Rename</Menu.ContextItem>
                <Menu.ContextSeparator />
                <ContextDangerItem>Delete</ContextDangerItem>
              </Menu.ContextContent>
            </Menu.Context>
          </Section>

          <Section title="Tabs">
            <Tabs defaultValue="one" className="w-full">
              <TabsList>
                <TabsTrigger value="one">Tasks</TabsTrigger>
                <TabsTrigger value="two">Signals</TabsTrigger>
                <TabsTrigger value="three">Sessions</TabsTrigger>
              </TabsList>
              <TabsContent value="one" className="pt-4 text-sm text-muted-foreground">Tasks panel</TabsContent>
              <TabsContent value="two" className="pt-4 text-sm text-muted-foreground">Signals panel</TabsContent>
              <TabsContent value="three" className="pt-4 text-sm text-muted-foreground">Sessions panel</TabsContent>
            </Tabs>
          </Section>

          <Section title="Toast" note="Sonner, pinned to dark. Sits above dialogs — the old toast rendered behind them.">
            <Button onClick={() => toast("Note saved")}>Default</Button>
            <Button variant="secondary" onClick={() => toast.success("Vault connected")}>Success</Button>
            <Button variant="outline" onClick={() => toast.warning("Time slot occupied")}>Warning</Button>
            <Button variant="destructive" onClick={() => toast.error("Could not reach vault")}>Error</Button>
          </Section>

          <Section title="Skeleton">
            <div className="flex w-full flex-col gap-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Section>

          <div className="h-16" />
        </div>

        <AppDialog
          open={dialog === "dialog"}
          onClose={() => setDialog(null)}
          title="Dialog title"
          description="Descriptive line explaining what this dialog is for."
          footer={
            <>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button onClick={() => setDialog(null)}>Confirm</Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Body content. Tab stays inside, background scroll is locked, Escape closes.
          </p>
        </AppDialog>

        <ConfirmDialog
          open={dialog === "confirm"}
          onClose={() => setDialog(null)}
          onConfirm={() => toast.success("Deleted")}
          title="Delete this decision?"
          description="This can't be undone."
          confirmLabel="Delete"
        />

        <PromptDialog
          open={dialog === "prompt"}
          onClose={() => setDialog(null)}
          onSubmit={(v) => toast.success(`Renamed to "${v}"`)}
          title="Rename note"
          label="Title"
          placeholder="Untitled"
          initialValue="Weekly review"
        />

        <SidePanel
          open={dialog === "panel"}
          onClose={() => setDialog(null)}
          title="Graph controls"
          description="Filters, physics and display."
        >
          <div className="flex flex-col gap-4">
            <Input placeholder="Search nodes…" />
            <Separator />
            <p className="text-sm text-muted-foreground">Panel body.</p>
          </div>
        </SidePanel>

        <Toaster position="bottom-center" />
      </div>
    </TooltipProvider>
  );
}
