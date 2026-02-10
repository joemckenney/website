import { vars } from "@crow/theme";
import { keyframes, style } from "@vanilla-extract/css";

// Compact header for base/table views
export const header = style({
  padding: "6px 12px",
  borderBottom: `1px solid ${vars.colors.stone300}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "white",
  height: "32px",
});

export const title = style({
  fontSize: "12px",
  fontWeight: "500",
  letterSpacing: "0.3px",
});

export const newButton = style({
  fontSize: "11px",
  color: vars.colors.stone50,
  background: vars.colors.stone800,
  padding: "4px 10px",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: vars.fonts.mono,
  borderRadius: "3px",
  ":hover": {
    background: vars.colors.stone700,
  },
});

export const container = style({
  flex: 1,
  overflowY: "auto",
  padding: "12px",
});

export const loading = style({
  textAlign: "center",
  color: vars.colors.stone500,
  fontSize: "12px",
  padding: "24px",
});

export const error = style({
  textAlign: "center",
  color: "#dc2626",
  fontSize: "12px",
  padding: "24px",
});

export const empty = style({
  textAlign: "center",
  color: vars.colors.stone500,
  fontSize: "12px",
  padding: "24px",
});

export const emptyLink = style({
  display: "inline-block",
  marginTop: "8px",
  color: vars.colors.stone700,
  textDecoration: "underline",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: vars.fonts.mono,
  fontSize: "12px",
  ":hover": {
    color: vars.colors.stone900,
  },
});

export const list = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  maxWidth: "600px",
  marginLeft: "auto",
  marginRight: "auto",
});

export const item = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  borderBottom: `1px solid ${vars.colors.stone200}`,
  textDecoration: "none",
  color: vars.colors.stone900,
  fontSize: "12px",
  ":hover": {
    background: vars.colors.stone100,
  },
});

export const itemTitle = style({
  fontWeight: "400",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  marginRight: "12px",
});

export const itemDate = style({
  fontSize: "11px",
  color: vars.colors.stone500,
  flexShrink: 0,
});

// Toolbar - very compact
export const toolbar = style({
  padding: "4px 8px",
  borderBottom: `1px solid ${vars.colors.stone300}`,
  display: "flex",
  alignItems: "center",
  gap: "6px",
  background: vars.colors.stone50,
  height: "28px",
});

export const toolbarButton = style({
  fontSize: "11px",
  color: vars.colors.stone600,
  background: "transparent",
  padding: "3px 8px",
  border: `1px solid ${vars.colors.stone300}`,
  cursor: "pointer",
  fontFamily: vars.fonts.mono,
  borderRadius: "3px",
  ":hover": {
    background: vars.colors.stone100,
    borderColor: vars.colors.stone400,
  },
});

// Table Grid - Excel-like tight spacing
export const tableContainer = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

export const gridWrapper = style({
  flex: 1,
  overflow: "auto",
});

export const grid = style({
  display: "table",
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "fit-content",
  fontSize: "12px",
});

export const gridHeader = style({
  display: "table-header-group",
  position: "sticky",
  top: 0,
  zIndex: 10,
  background: vars.colors.stone100,
});

export const gridHeaderRow = style({
  display: "table-row",
});

export const gridHeaderCell = style({
  display: "table-cell",
  padding: "4px 8px",
  borderBottom: `1px solid ${vars.colors.stone300}`,
  borderRight: `1px solid ${vars.colors.stone200}`,
  fontSize: "11px",
  fontWeight: "500",
  color: vars.colors.stone600,
  textAlign: "left",
  minWidth: "100px",
  userSelect: "none",
  whiteSpace: "nowrap",
  height: "24px",
  selectors: {
    "&:last-child": {
      borderRight: "none",
    },
  },
});

export const gridBody = style({
  display: "table-row-group",
});

export const gridRow = style({
  display: "table-row",
  ":hover": {
    background: vars.colors.stone50,
  },
});

export const gridCell = style({
  display: "table-cell",
  padding: "2px 8px",
  borderBottom: `1px solid ${vars.colors.stone200}`,
  borderRight: `1px solid ${vars.colors.stone200}`,
  fontSize: "12px",
  color: vars.colors.stone900,
  minWidth: "100px",
  height: "24px",
  verticalAlign: "middle",
  selectors: {
    "&:last-child": {
      borderRight: "none",
    },
  },
});

export const cellEditing = style({
  padding: 0,
  background: "white",
});

export const cellInput = style({
  width: "100%",
  height: "100%",
  padding: "2px 8px",
  border: `2px solid ${vars.colors.stone600}`,
  outline: "none",
  fontSize: "12px",
  fontFamily: vars.fonts.mono,
  background: "white",
});

export const cellCheckbox = style({
  width: "14px",
  height: "14px",
  cursor: "pointer",
});

export const addRowButton = style({
  display: "table-row",
  cursor: "pointer",
  ":hover": {
    background: vars.colors.stone100,
  },
});

export const addRowCell = style({
  display: "table-cell",
  padding: "2px 8px",
  borderBottom: `1px solid ${vars.colors.stone200}`,
  fontSize: "11px",
  color: vars.colors.stone400,
  height: "24px",
});

// Modal - compact
export const modalOverlay = style({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
});

export const modal = style({
  background: "white",
  padding: "16px",
  maxWidth: "320px",
  width: "90%",
  borderRadius: "4px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
});

export const modalTitle = style({
  fontSize: "13px",
  fontWeight: "500",
  marginBottom: "12px",
});

export const formField = style({
  marginBottom: "12px",
});

export const formLabel = style({
  display: "block",
  fontSize: "11px",
  fontWeight: "500",
  color: vars.colors.stone600,
  marginBottom: "4px",
});

export const formInput = style({
  width: "100%",
  padding: "6px 8px",
  border: `1px solid ${vars.colors.stone300}`,
  fontSize: "12px",
  fontFamily: vars.fonts.mono,
  borderRadius: "3px",
  ":focus": {
    outline: "none",
    borderColor: vars.colors.stone500,
  },
});

export const formSelect = style({
  width: "100%",
  padding: "6px 8px",
  border: `1px solid ${vars.colors.stone300}`,
  fontSize: "12px",
  fontFamily: vars.fonts.mono,
  background: "white",
  cursor: "pointer",
  borderRadius: "3px",
  ":focus": {
    outline: "none",
    borderColor: vars.colors.stone500,
  },
});

export const modalActions = style({
  display: "flex",
  gap: "8px",
  justifyContent: "flex-end",
  marginTop: "16px",
});

export const modalButton = style({
  padding: "6px 12px",
  fontSize: "11px",
  fontFamily: vars.fonts.mono,
  cursor: "pointer",
  borderRadius: "3px",
});

export const modalButtonPrimary = style([
  modalButton,
  {
    background: vars.colors.stone800,
    color: vars.colors.stone50,
    border: "none",
    ":hover": {
      background: vars.colors.stone700,
    },
  },
]);

export const modalButtonSecondary = style([
  modalButton,
  {
    background: "white",
    color: vars.colors.stone700,
    border: `1px solid ${vars.colors.stone300}`,
    ":hover": {
      background: vars.colors.stone100,
    },
  },
]);

// Split pane - no longer needed, but keep for compatibility
export const splitPane = style({
  flex: 1,
  display: "flex",
  overflow: "hidden",
});

export const tablePane = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minWidth: 0,
});

// Tab bar for tables - compact
export const tabBar = style({
  display: "flex",
  alignItems: "center",
  gap: "2px",
  padding: "0 8px",
  borderBottom: `1px solid ${vars.colors.stone300}`,
  background: vars.colors.stone100,
  height: "28px",
  overflowX: "auto",
  flexShrink: 0,
});

export const tab = style({
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  height: "28px",
  fontSize: "11px",
  fontFamily: vars.fonts.mono,
  color: vars.colors.stone600,
  background: "transparent",
  border: "none",
  borderBottom: "2px solid transparent",
  cursor: "pointer",
  whiteSpace: "nowrap",
  marginBottom: "-1px",
  ":hover": {
    color: vars.colors.stone900,
    background: vars.colors.stone200,
  },
  selectors: {
    '&[data-active="true"]': {
      color: vars.colors.stone900,
      background: "white",
      borderBottomColor: "white",
    },
  },
});

export const addTabButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  fontSize: "14px",
  color: vars.colors.stone400,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  borderRadius: "3px",
  ":hover": {
    color: vars.colors.stone700,
    background: vars.colors.stone200,
  },
});

export const baseNameInput = style({
  fontSize: "12px",
  fontWeight: "500",
  border: "none",
  background: "transparent",
  padding: "2px 4px",
  margin: "-2px -4px",
  outline: "none",
  width: "auto",
  minWidth: "80px",
  ":focus": {
    background: vars.colors.stone100,
  },
});

// Chat Panel - compact
export const chatPanel = style({
  display: "flex",
  flexDirection: "column",
  background: "white",
  height: "100%",
});

export const chatPanelHeader = style({
  padding: "8px 12px",
  borderBottom: `1px solid ${vars.colors.stone200}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "32px",
});

export const chatPanelTitle = style({
  fontSize: "11px",
  fontWeight: "500",
  color: vars.colors.stone600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
});

export const chatPanelHeaderRight = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

export const chatPanelStatus = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "10px",
  color: vars.colors.stone500,
});

export const chatPanelStatusDot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: vars.colors.stone400,
  selectors: {
    '&[data-status="active"]': {
      background: "#22c55e",
    },
  },
});

export const chatPanelCloseBtn = style({
  width: "20px",
  height: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: vars.colors.stone400,
  borderRadius: "3px",
  ":hover": {
    background: vars.colors.stone100,
    color: vars.colors.stone700,
  },
});

export const chatPanelError = style({
  padding: "6px 12px",
  background: "#fef2f2",
  color: "#dc2626",
  fontSize: "11px",
  borderBottom: "1px solid #fecaca",
});

export const chatPanelMessages = style({
  flex: 1,
  overflowY: "auto",
  padding: "12px",
});

export const chatPanelLoading = style({
  textAlign: "center",
  color: vars.colors.stone500,
  fontSize: "12px",
  padding: "12px",
});

export const chatPanelMessageUser = style({
  marginBottom: "12px",
});

export const chatPanelMessageAssistant = style({
  marginBottom: "12px",
});

export const chatPanelMessageRole = style({
  fontSize: "9px",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  color: vars.colors.stone500,
  marginBottom: "2px",
});

export const chatPanelMessageContent = style({
  fontSize: "12px",
  lineHeight: "1.4",
  color: vars.colors.stone900,
  wordBreak: "break-word",
});

export const chatPanelToolCalls = style({
  marginTop: "6px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

export const chatPanelToolCall = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "3px 6px",
  background: vars.colors.stone100,
  borderRadius: "3px",
  fontSize: "10px",
});

export const chatPanelToolCallName = style({
  fontFamily: vars.fonts.mono,
  color: vars.colors.stone600,
});

export const chatPanelToolCallStatus = style({
  color: "#22c55e",
  fontSize: "9px",
  textTransform: "uppercase",
});

const pulse = keyframes({
  "0%, 100%": {
    opacity: 0.3,
  },
  "50%": {
    opacity: 1,
  },
});

export const chatPanelThinking = style({
  display: "flex",
  alignItems: "center",
  gap: "3px",
  padding: "8px",
});

export const chatPanelThinkingDot = style({
  width: "4px",
  height: "4px",
  background: vars.colors.stone400,
  borderRadius: "50%",
  animation: `${pulse} 1.2s ease-in-out infinite`,
  selectors: {
    "&:nth-child(2)": {
      animationDelay: "0.2s",
    },
    "&:nth-child(3)": {
      animationDelay: "0.4s",
    },
  },
});

export const chatPanelInputArea = style({
  padding: "8px",
  borderTop: `1px solid ${vars.colors.stone200}`,
  display: "flex",
  gap: "6px",
});

export const chatPanelInput = style({
  flex: 1,
  fontFamily: vars.fonts.mono,
  fontSize: "12px",
  padding: "6px 8px",
  border: `1px solid ${vars.colors.stone300}`,
  background: "white",
  color: vars.colors.stone900,
  resize: "none",
  outline: "none",
  minHeight: "32px",
  maxHeight: "80px",
  borderRadius: "3px",
  ":focus": {
    borderColor: vars.colors.stone500,
  },
  "::placeholder": {
    color: vars.colors.stone400,
  },
});

export const chatPanelSendBtn = style({
  width: "32px",
  height: "32px",
  background: vars.colors.stone800,
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.colors.stone50,
  borderRadius: "3px",
  flexShrink: 0,
  ":hover": {
    background: vars.colors.stone700,
  },
  ":disabled": {
    opacity: 0.4,
    cursor: "not-allowed",
  },
});

// Agents dropdown
export const agentsDropdownWrapper = style({
  position: "relative",
});

export const agentsDropdown = style({
  position: "absolute",
  top: "100%",
  left: 0,
  marginTop: "4px",
  background: "white",
  border: `1px solid ${vars.colors.stone300}`,
  borderRadius: "4px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  minWidth: "260px",
  zIndex: 100,
  padding: "4px 0",
});

export const agentsDropdownItem = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 12px",
  fontSize: "11px",
  fontFamily: vars.fonts.mono,
  color: vars.colors.stone800,
  ":hover": {
    background: vars.colors.stone50,
  },
});

export const agentsDropdownItemInfo = style({
  display: "flex",
  flexDirection: "column",
  gap: "1px",
  flex: 1,
  minWidth: 0,
});

export const agentsDropdownItemName = style({
  fontWeight: "500",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const agentsDropdownItemTrigger = style({
  fontSize: "10px",
  color: vars.colors.stone500,
});

export const agentsDropdownToggle = style({
  width: "28px",
  height: "16px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  flexShrink: 0,
  marginLeft: "8px",
  position: "relative",
  transition: "background 0.15s",
  selectors: {
    '&[data-enabled="true"]': {
      background: vars.colors.stone800,
    },
    '&[data-enabled="false"]': {
      background: vars.colors.stone300,
    },
  },
});

export const agentsDropdownToggleKnob = style({
  position: "absolute",
  top: "2px",
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  background: "white",
  transition: "left 0.15s",
  selectors: {
    '[data-enabled="true"] > &': {
      left: "14px",
    },
    '[data-enabled="false"] > &': {
      left: "2px",
    },
  },
});

export const agentsDropdownEmpty = style({
  padding: "12px",
  fontSize: "11px",
  color: vars.colors.stone500,
  textAlign: "center",
});

// Chat toggle - for toolbar (may not be needed anymore)
export const chatToggleBtn = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "11px",
  color: vars.colors.stone600,
  background: "transparent",
  padding: "3px 8px",
  border: `1px solid ${vars.colors.stone300}`,
  cursor: "pointer",
  fontFamily: vars.fonts.mono,
  borderRadius: "3px",
  marginLeft: "auto",
  ":hover": {
    background: vars.colors.stone100,
  },
  selectors: {
    '&[data-active="true"]': {
      background: vars.colors.stone800,
      color: vars.colors.stone50,
      borderColor: vars.colors.stone800,
    },
  },
});
