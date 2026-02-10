import { vars } from "@crow/theme";
import { keyframes, style } from "@vanilla-extract/css";

// Page header
export const header = style({
  padding: `${vars.space[4]} ${vars.space[6]}`,
  borderBottom: `1px solid ${vars.colors.stone300}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const title = style({
  fontFamily: vars.fonts.display,
  fontSize: vars.fontSizes.base.fontSize,
  fontWeight: "400",
  letterSpacing: vars.letterSpacing.wider,
  textTransform: "uppercase",
});

export const newButton = style({
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone50,
  background: vars.colors.stone900,
  padding: `${vars.space[2]} ${vars.space[4]}`,
  textDecoration: "none",
  letterSpacing: vars.letterSpacing.wide,
  transition: "opacity 0.15s ease",
  border: "none",
  cursor: "pointer",
  fontFamily: vars.fonts.mono,
  ":hover": {
    opacity: 0.85,
  },
});

export const container = style({
  flex: 1,
  overflowY: "auto",
  padding: vars.space[6],
});

export const loading = style({
  textAlign: "center",
  color: vars.colors.stone600,
  fontSize: vars.fontSizes.sm.fontSize,
  padding: vars.space[8],
});

export const error = style({
  textAlign: "center",
  color: "#991b1b",
  fontSize: vars.fontSizes.sm.fontSize,
  padding: vars.space[8],
});

export const empty = style({
  textAlign: "center",
  color: vars.colors.stone600,
  fontSize: vars.fontSizes.sm.fontSize,
  padding: vars.space[8],
});

export const emptyLink = style({
  display: "inline-block",
  marginTop: vars.space[4],
  color: vars.colors.stone900,
  textDecoration: "underline",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: vars.fonts.mono,
  fontSize: vars.fontSizes.sm.fontSize,
  ":hover": {
    textDecoration: "none",
  },
});

export const list = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  maxWidth: "680px",
  marginLeft: "auto",
  marginRight: "auto",
});

export const item = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${vars.space[4]} ${vars.space[5]}`,
  borderBottom: `1px solid ${vars.colors.stone300}`,
  textDecoration: "none",
  color: vars.colors.stone900,
  transition: "background 0.15s ease",
  ":hover": {
    background: vars.colors.stone100,
  },
});

export const itemTitle = style({
  fontSize: vars.fontSizes.base.fontSize,
  fontWeight: "400",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  marginRight: vars.space[4],
});

export const itemDate = style({
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone600,
  letterSpacing: vars.letterSpacing.wide,
  flexShrink: 0,
});

// Table Grid
export const tableContainer = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

export const toolbar = style({
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderBottom: `1px solid ${vars.colors.stone300}`,
  display: "flex",
  alignItems: "center",
  gap: vars.space[3],
  background: vars.colors.stone50,
});

export const toolbarButton = style({
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone700,
  background: "transparent",
  padding: `${vars.space[1]} ${vars.space[3]}`,
  border: `1px solid ${vars.colors.stone300}`,
  cursor: "pointer",
  fontFamily: vars.fonts.mono,
  letterSpacing: vars.letterSpacing.wide,
  transition: "all 0.15s ease",
  ":hover": {
    background: vars.colors.stone100,
    borderColor: vars.colors.stone400,
  },
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
  padding: `${vars.space[2]} ${vars.space[3]}`,
  borderBottom: `2px solid ${vars.colors.stone300}`,
  borderRight: `1px solid ${vars.colors.stone200}`,
  fontSize: vars.fontSizes.xs.fontSize,
  fontWeight: "500",
  letterSpacing: vars.letterSpacing.wide,
  textTransform: "uppercase",
  color: vars.colors.stone700,
  textAlign: "left",
  minWidth: "120px",
  userSelect: "none",
  whiteSpace: "nowrap",
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
  transition: "background 0.1s ease",
  ":hover": {
    background: vars.colors.stone100,
  },
});

export const gridCell = style({
  display: "table-cell",
  padding: `${vars.space[2]} ${vars.space[3]}`,
  borderBottom: `1px solid ${vars.colors.stone200}`,
  borderRight: `1px solid ${vars.colors.stone200}`,
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone900,
  minWidth: "120px",
  verticalAlign: "middle",
  selectors: {
    "&:last-child": {
      borderRight: "none",
    },
  },
});

export const cellEditing = style({
  padding: 0,
  background: vars.colors.stone50,
});

export const cellInput = style({
  width: "100%",
  height: "100%",
  padding: `${vars.space[2]} ${vars.space[3]}`,
  border: `2px solid ${vars.colors.stone900}`,
  outline: "none",
  fontSize: vars.fontSizes.sm.fontSize,
  fontFamily: vars.fonts.mono,
  background: "white",
});

export const cellCheckbox = style({
  width: "16px",
  height: "16px",
  cursor: "pointer",
});

export const addRowButton = style({
  display: "table-row",
  cursor: "pointer",
  transition: "background 0.1s ease",
  ":hover": {
    background: vars.colors.stone100,
  },
});

export const addRowCell = style({
  display: "table-cell",
  padding: `${vars.space[2]} ${vars.space[3]}`,
  borderBottom: `1px solid ${vars.colors.stone200}`,
  fontSize: vars.fontSizes.sm.fontSize,
  color: vars.colors.stone500,
  fontStyle: "italic",
});

// Modal
export const modalOverlay = style({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
});

export const modal = style({
  background: "white",
  padding: vars.space[6],
  maxWidth: "400px",
  width: "90%",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
});

export const modalTitle = style({
  fontFamily: vars.fonts.display,
  fontSize: vars.fontSizes.lg.fontSize,
  fontWeight: "400",
  marginBottom: vars.space[4],
  letterSpacing: vars.letterSpacing.wide,
});

export const formField = style({
  marginBottom: vars.space[4],
});

export const formLabel = style({
  display: "block",
  fontSize: vars.fontSizes.xs.fontSize,
  fontWeight: "500",
  letterSpacing: vars.letterSpacing.wide,
  textTransform: "uppercase",
  color: vars.colors.stone700,
  marginBottom: vars.space[2],
});

export const formInput = style({
  width: "100%",
  padding: vars.space[3],
  border: `1px solid ${vars.colors.stone300}`,
  fontSize: vars.fontSizes.sm.fontSize,
  fontFamily: vars.fonts.mono,
  ":focus": {
    outline: "none",
    borderColor: vars.colors.stone900,
  },
});

export const formSelect = style({
  width: "100%",
  padding: vars.space[3],
  border: `1px solid ${vars.colors.stone300}`,
  fontSize: vars.fontSizes.sm.fontSize,
  fontFamily: vars.fonts.mono,
  background: "white",
  cursor: "pointer",
  ":focus": {
    outline: "none",
    borderColor: vars.colors.stone900,
  },
});

export const modalActions = style({
  display: "flex",
  gap: vars.space[3],
  justifyContent: "flex-end",
  marginTop: vars.space[6],
});

export const modalButton = style({
  padding: `${vars.space[2]} ${vars.space[4]}`,
  fontSize: vars.fontSizes.sm.fontSize,
  fontFamily: vars.fonts.mono,
  letterSpacing: vars.letterSpacing.wide,
  cursor: "pointer",
  transition: "all 0.15s ease",
});

export const modalButtonPrimary = style([
  modalButton,
  {
    background: vars.colors.stone900,
    color: vars.colors.stone50,
    border: "none",
    ":hover": {
      opacity: 0.85,
    },
  },
]);

export const modalButtonSecondary = style([
  modalButton,
  {
    background: "transparent",
    color: vars.colors.stone700,
    border: `1px solid ${vars.colors.stone300}`,
    ":hover": {
      background: vars.colors.stone100,
    },
  },
]);

// Split pane layout for table + chat
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

// Chat Panel
export const chatPanel = style({
  width: "360px",
  display: "flex",
  flexDirection: "column",
  borderLeft: `1px solid ${vars.colors.stone300}`,
  background: vars.colors.stone50,
});

export const chatPanelHeader = style({
  padding: `${vars.space[3]} ${vars.space[4]}`,
  borderBottom: `1px solid ${vars.colors.stone300}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "white",
});

export const chatPanelTitle = style({
  fontFamily: vars.fonts.display,
  fontSize: vars.fontSizes.sm.fontSize,
  fontWeight: "500",
  letterSpacing: vars.letterSpacing.wide,
  textTransform: "uppercase",
});

export const chatPanelHeaderRight = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[3],
});

export const chatPanelStatus = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[1],
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone600,
});

export const chatPanelStatusDot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: vars.colors.stone400,
  selectors: {
    '&[data-status="active"]': {
      background: vars.colors.sage500,
    },
  },
});

export const chatPanelCloseBtn = style({
  width: "24px",
  height: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: vars.colors.stone600,
  borderRadius: "4px",
  transition: "all 0.15s ease",
  ":hover": {
    background: vars.colors.stone200,
    color: vars.colors.stone900,
  },
});

export const chatPanelError = style({
  padding: `${vars.space[2]} ${vars.space[4]}`,
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: vars.fontSizes.xs.fontSize,
  borderBottom: "1px solid #fecaca",
});

export const chatPanelMessages = style({
  flex: 1,
  overflowY: "auto",
  padding: vars.space[4],
  "::-webkit-scrollbar": {
    width: "4px",
  },
  "::-webkit-scrollbar-track": {
    background: "transparent",
  },
  "::-webkit-scrollbar-thumb": {
    background: vars.colors.stone300,
  },
});

export const chatPanelLoading = style({
  textAlign: "center",
  color: vars.colors.stone600,
  fontSize: vars.fontSizes.sm.fontSize,
  padding: vars.space[4],
});

export const chatPanelMessageUser = style({
  marginBottom: vars.space[3],
});

export const chatPanelMessageAssistant = style({
  marginBottom: vars.space[3],
});

export const chatPanelMessageRole = style({
  fontSize: "9px",
  letterSpacing: vars.letterSpacing.widest,
  textTransform: "uppercase",
  color: vars.colors.stone600,
  marginBottom: vars.space[1],
});

export const chatPanelMessageContent = style({
  fontSize: vars.fontSizes.sm.fontSize,
  lineHeight: "1.5",
  color: vars.colors.stone900,
  wordBreak: "break-word",
});

export const chatPanelToolCalls = style({
  marginTop: vars.space[2],
  display: "flex",
  flexDirection: "column",
  gap: vars.space[1],
});

export const chatPanelToolCall = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space[2],
  padding: `${vars.space[1]} ${vars.space[2]}`,
  background: vars.colors.stone200,
  borderRadius: "4px",
  fontSize: vars.fontSizes.xs.fontSize,
});

export const chatPanelToolCallName = style({
  fontFamily: vars.fonts.mono,
  color: vars.colors.stone700,
});

export const chatPanelToolCallStatus = style({
  color: vars.colors.sage600,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: vars.letterSpacing.wide,
});

const pulse = keyframes({
  "0%, 100%": {
    opacity: 0.3,
    transform: "scale(1)",
  },
  "50%": {
    opacity: 1,
    transform: "scale(1.2)",
  },
});

export const chatPanelThinking = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: vars.space[2],
});

export const chatPanelThinkingDot = style({
  width: "4px",
  height: "4px",
  background: vars.colors.stone600,
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
  padding: vars.space[3],
  borderTop: `1px solid ${vars.colors.stone300}`,
  background: "white",
  display: "flex",
  gap: vars.space[2],
});

export const chatPanelInput = style({
  flex: 1,
  fontFamily: vars.fonts.mono,
  fontSize: vars.fontSizes.sm.fontSize,
  padding: `${vars.space[2]} ${vars.space[3]}`,
  border: `1px solid ${vars.colors.stone300}`,
  background: vars.colors.stone50,
  color: vars.colors.stone900,
  resize: "none",
  outline: "none",
  minHeight: "36px",
  maxHeight: "100px",
  transition: "border-color 0.15s ease",
  ":focus": {
    borderColor: vars.colors.stone900,
  },
  "::placeholder": {
    color: vars.colors.stone500,
  },
});

export const chatPanelSendBtn = style({
  width: "36px",
  height: "36px",
  background: vars.colors.stone900,
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.colors.stone50,
  transition: "opacity 0.15s ease",
  flexShrink: 0,
  ":hover": {
    opacity: 0.85,
  },
  ":disabled": {
    opacity: 0.4,
    cursor: "not-allowed",
  },
});

// Chat toggle button in toolbar
export const chatToggleBtn = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[1],
  fontSize: vars.fontSizes.xs.fontSize,
  color: vars.colors.stone700,
  background: "transparent",
  padding: `${vars.space[1]} ${vars.space[3]}`,
  border: `1px solid ${vars.colors.stone300}`,
  cursor: "pointer",
  fontFamily: vars.fonts.mono,
  letterSpacing: vars.letterSpacing.wide,
  transition: "all 0.15s ease",
  marginLeft: "auto",
  ":hover": {
    background: vars.colors.stone100,
    borderColor: vars.colors.stone400,
  },
  selectors: {
    '&[data-active="true"]': {
      background: vars.colors.stone900,
      color: vars.colors.stone50,
      borderColor: vars.colors.stone900,
    },
  },
});

// Tab bar for base detail view
export const tabBar = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[1],
  padding: `0 ${vars.space[4]}`,
  borderBottom: `1px solid ${vars.colors.stone300}`,
  background: vars.colors.stone50,
  overflowX: "auto",
  flexShrink: 0,
});

export const tab = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[2],
  padding: `${vars.space[3]} ${vars.space[4]}`,
  fontSize: vars.fontSizes.sm.fontSize,
  fontFamily: vars.fonts.mono,
  color: vars.colors.stone600,
  background: "transparent",
  border: "none",
  borderBottom: "2px solid transparent",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
  ":hover": {
    color: vars.colors.stone900,
    background: vars.colors.stone100,
  },
  selectors: {
    '&[data-active="true"]': {
      color: vars.colors.stone900,
      borderBottomColor: vars.colors.stone900,
    },
  },
});

export const addTabButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  fontSize: vars.fontSizes.lg.fontSize,
  color: vars.colors.stone500,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  borderRadius: "4px",
  marginLeft: vars.space[2],
  transition: "all 0.15s ease",
  ":hover": {
    color: vars.colors.stone900,
    background: vars.colors.stone200,
  },
});

export const baseNameInput = style({
  fontFamily: vars.fonts.display,
  fontSize: vars.fontSizes.base.fontSize,
  fontWeight: "400",
  letterSpacing: vars.letterSpacing.wider,
  textTransform: "uppercase",
  border: "none",
  background: "transparent",
  padding: `${vars.space[1]} ${vars.space[2]}`,
  margin: `-${vars.space[1]} -${vars.space[2]}`,
  outline: "none",
  width: "auto",
  minWidth: "100px",
  ":focus": {
    background: vars.colors.stone100,
  },
});
