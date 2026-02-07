import { vars } from "@crow/theme";
import { style } from "@vanilla-extract/css";

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
