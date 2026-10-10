import { AlignLeft, Calendar, CalendarClock, CornerDownRight, Hash, List, Paintbrush, SquareCheck, Tag } from "lucide-react";
import { toLocalInputValue } from "@/lib/time";

export const TYPE_ICONS = {
  text: AlignLeft,
  number: Hash,
  checkbox: SquareCheck,
  date: Calendar,
  datetime: CalendarClock,
  list: List,
  tags: Tag,
  aliases: CornerDownRight,
  cssclasses: Paintbrush,
};

// What the add form offers. tags, aliases and cssclasses are picked by name, like Obsidian.
export const TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "list", label: "List" },
  { value: "number", label: "Number" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date and time" },
];

const NAME_TYPES = { tags: "tags", aliases: "aliases", cssclasses: "cssclasses", kind: "text", status: "text", owner: "text" };

/** The type a name forces, or null when the user picks. */
export const forcedTypeFor = (name) => NAME_TYPES[String(name).trim()] ?? null;

export const isListType = (type) => ["list", "tags", "aliases", "cssclasses"].includes(type);

/** A value that infers back to the chosen type once written (an empty number would read as text). */
export const initialValue = (type) => {
  const now = toLocalInputValue(new Date());
  if (isListType(type)) return [];
  if (type === "number") return 0;
  if (type === "checkbox") return false;
  if (type === "date") return now.slice(0, 10);
  if (type === "datetime") return now;
  return "";
};

export const isEmptyValue = (type, value) => (isListType(type) ? value.length === 0 : type === "text" && value === "");

/** Fields a property edit can change. EditorPage copies these onto its working note. */
export const PROPERTY_FIELDS = ["tags", "kind", "status", "owner", "frontmatterKeys", "frontmatterRaw", "frontmatterExtra"];
