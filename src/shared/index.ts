/**
 * Barrel export for the shared layer.
 *
 * NOT imported by production code yet — individual imports
 * (e.g. `@/shared/rbac/permissions`) are preferred for tree-shaking.
 * Kept here as a convenience for future stages.
 *
 * Dead V2 layout files (DashboardLayoutV2, DashboardFoundationLayout,
 * demo-pages) were removed in Phase 2 — the live shell is
 * `src/components/layout/DashboardShell.tsx`, which already imports
 * the live parts of System 2 (navigation-v2, motion-presets,
 * ThemeProvider, RoleDashboardOverview) transitively.
 */

// Design tokens
export * from "./design-tokens";

// Errors
export * from "./errors";

// RBAC
export * from "./rbac/permissions";
export {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
} from "./rbac/requirePermission";

// Validation
export * from "./validation/schemas";

// Constants
export * from "./constants";

// Utils
export * from "./utils";

// Hooks
export * from "./hooks";

// Types
export * from "./types";

// Motion presets
export * from "./lib/motion-presets";

// Foundation components
export {
  Spinner,
  Loading,
  Checkbox,
  Switch,
  Radio,
  Alert,
  FormField,
  SectionHeader,
  PageHeader,
  StatisticCard,
  Pagination,
  DataTable,
  EmptyState,
  Tooltip,
  Popover,
  Drawer,
  FoundationBadge,
  FoundationAvatar,
  FoundationSkeleton,
  type DataTableColumn,
  type AlertProps,
  type FormFieldProps,
} from "./components/foundation";

// Navigation
export {
  NAV_SECTIONS,
  getNavSectionsForRole,
  getFlatNavForRole,
  type NavSection,
} from "./config/navigation-v2";
