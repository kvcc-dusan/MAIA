import { SOLAR } from "./solarData.js";

const SVG_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

// Same prop surface the old Lucide icons had (size, strokeWidth, className, aria-*), so call sites only change their import.
const createIcon = (key, displayName) => {
  const body = SOLAR[key];
  const Icon = ({ size = 24, strokeWidth = 1.5, ...props }) => (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      {...SVG_PROPS}
      {...props}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
  Icon.displayName = displayName;
  return Icon;
};

export const Activity = createIcon("pulse-linear", "Activity");
export const AlignLeft = createIcon("align-left-linear", "AlignLeft");
export const ArrowRightLeft = createIcon("transfer-horizontal-linear", "ArrowRightLeft");
export const ArrowUpDown = createIcon("sort-vertical-linear", "ArrowUpDown");
export const BellOff = createIcon("bell-off-linear", "BellOff");
export const BookOpen = createIcon("book-linear", "BookOpen");
export const Bug = createIcon("bug-linear", "Bug");
export const Calendar = createIcon("calendar-linear", "Calendar");
export const CalendarClock = createIcon("calendar-mark-linear", "CalendarClock");
export const CalendarDays = createIcon("calendar-date-linear", "CalendarDays");
export const Check = createIcon("check-linear", "Check");
export const CheckCircle2 = createIcon("check-circle-linear", "CheckCircle2");
export const CheckIcon = createIcon("check-linear", "CheckIcon");
export const ChevronDown = createIcon("alt-arrow-down-linear", "ChevronDown");
export const ChevronDownIcon = createIcon("alt-arrow-down-linear", "ChevronDownIcon");
export const ChevronLeft = createIcon("alt-arrow-left-linear", "ChevronLeft");
export const ChevronLeftIcon = createIcon("alt-arrow-left-linear", "ChevronLeftIcon");
export const ChevronRight = createIcon("alt-arrow-right-linear", "ChevronRight");
export const ChevronRightIcon = createIcon("alt-arrow-right-linear", "ChevronRightIcon");
export const ChevronUp = createIcon("alt-arrow-up-linear", "ChevronUp");
export const ChevronUpIcon = createIcon("alt-arrow-up-linear", "ChevronUpIcon");
export const ChevronsDownUp = createIcon("chevrons-down-up-linear", "ChevronsDownUp");
export const ChevronsUpDown = createIcon("chevrons-up-down-linear", "ChevronsUpDown");
export const CircleAlert = createIcon("danger-circle-linear", "CircleAlert");
export const CircleCheckIcon = createIcon("check-circle-linear", "CircleCheckIcon");
export const CircleHelp = createIcon("question-circle-linear", "CircleHelp");
export const CircleX = createIcon("close-circle-linear", "CircleX");
export const ClipboardList = createIcon("clipboard-list-linear", "ClipboardList");
export const Clock3 = createIcon("clock-circle-linear", "Clock3");
export const Command = createIcon("command-linear", "Command");
export const Copy = createIcon("copy-linear", "Copy");
export const CornerDownRight = createIcon("arrow-right-down-linear", "CornerDownRight");
export const Database = createIcon("database-linear", "Database");
export const Download = createIcon("download-linear", "Download");
export const File = createIcon("file-linear", "File");
export const FileSearch = createIcon("file-search-linear", "FileSearch");
export const FileText = createIcon("document-text-linear", "FileText");
export const Flame = createIcon("fire-linear", "Flame");
export const Folder = createIcon("folder-linear", "Folder");
export const FolderOpen = createIcon("folder-open-linear", "FolderOpen");
export const FolderPlus = createIcon("add-folder-linear", "FolderPlus");
export const FolderSearch = createIcon("folder-search-linear", "FolderSearch");
export const GitBranch = createIcon("git-branch-linear", "GitBranch");
export const Hash = createIcon("hashtag-linear", "Hash");
export const Info = createIcon("info-circle-linear", "Info");
export const InfoIcon = createIcon("info-circle-linear", "InfoIcon");
export const Layers = createIcon("layers-minimalistic-linear", "Layers");
export const Link2 = createIcon("link-linear", "Link2");
export const List = createIcon("list-linear", "List");
export const ListChecks = createIcon("checklist-minimalistic-linear", "ListChecks");
export const ListTodo = createIcon("checklist-linear", "ListTodo");
export const Loader2Icon = createIcon("loader-linear", "Loader2Icon");
export const LocateFixed = createIcon("gps-linear", "LocateFixed");
export const Mail = createIcon("letter-linear", "Mail");
export const Menu = createIcon("hamburger-menu-linear", "Menu");
export const MessageCircleQuestion = createIcon("chat-round-line-linear", "MessageCircleQuestion");
export const Minus = createIcon("minus-linear", "Minus");
export const Moon = createIcon("moon-linear", "Moon");
export const MoreHorizontal = createIcon("menu-dots-linear", "MoreHorizontal");
export const Network = createIcon("routing-2-linear", "Network");
export const NotebookPen = createIcon("notebook-linear", "NotebookPen");
export const OctagonXIcon = createIcon("forbidden-circle-linear", "OctagonXIcon");
export const Paintbrush = createIcon("paint-roller-linear", "Paintbrush");
export const Palette = createIcon("pallete-2-linear", "Palette");
export const PanelLeftClose = createIcon("sidebar-minimalistic-linear", "PanelLeftClose");
export const PanelLeftOpen = createIcon("sidebar-minimalistic-linear", "PanelLeftOpen");
export const Pencil = createIcon("pen-linear", "Pencil");
export const Plus = createIcon("add-linear", "Plus");
export const PlusIcon = createIcon("add-linear", "PlusIcon");
export const Quote = createIcon("quote-linear", "Quote");
export const Route = createIcon("route-linear", "Route");
export const Search = createIcon("magnifer-linear", "Search");
export const SearchIcon = createIcon("magnifer-linear", "SearchIcon");
export const SearchX = createIcon("magnifer-zoom-out-linear", "SearchX");
export const Settings = createIcon("settings-linear", "Settings");
export const Settings2 = createIcon("settings-minimalistic-linear", "Settings2");
export const Shapes = createIcon("widget-4-linear", "Shapes");
export const SlidersHorizontal = createIcon("tuning-2-linear", "SlidersHorizontal");
export const Sparkles = createIcon("stars-linear", "Sparkles");
export const SquareCheck = createIcon("check-square-linear", "SquareCheck");
export const SquarePen = createIcon("pen-new-square-linear", "SquarePen");
export const Sun = createIcon("sun-linear", "Sun");
export const Tag = createIcon("tag-linear", "Tag");
export const Trash2 = createIcon("trash-bin-minimalistic-linear", "Trash2");
export const TriangleAlert = createIcon("danger-triangle-linear", "TriangleAlert");
export const TriangleAlertIcon = createIcon("danger-triangle-linear", "TriangleAlertIcon");
export const Unlink = createIcon("link-broken-linear", "Unlink");
export const Upload = createIcon("upload-linear", "Upload");
export const X = createIcon("close-linear", "X");
export const XIcon = createIcon("close-linear", "XIcon");
export const Zap = createIcon("bolt-linear", "Zap");
export const Pin = createIcon("pin-linear", "Pin");
export const StickyNote = createIcon("notes-linear", "StickyNote");
export const ArrowDown = createIcon("arrow-down-linear", "ArrowDown");
export const ArrowUp = createIcon("arrow-up-linear", "ArrowUp");
export const Clock = createIcon("clock-circle-linear", "Clock");
export const ArrowLeft = createIcon("arrow-left-linear", "ArrowLeft");
export const ArrowRight = createIcon("arrow-right-linear", "ArrowRight");
export const Suitcase = createIcon("suitcase-linear", "Suitcase");
