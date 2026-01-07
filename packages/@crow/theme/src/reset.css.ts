import { globalStyle } from "@vanilla-extract/css";

// Forked from https://github.com/elad2412/the-new-css-reset (1.7.3)

globalStyle(
  "*:where(:not(html, iframe, canvas, img, svg, video, audio):not(svg *, symbol *))",
  {
    all: "unset",
    display: "revert",
  },
);

globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
});

globalStyle("a, button", {
  cursor: "revert",
});

globalStyle("ol, ul, menu", {
  listStyle: "none",
});

globalStyle("table", {
  borderCollapse: "collapse",
});

globalStyle("input, textarea", {
  WebkitUserSelect: "auto",
});

globalStyle("textarea, pre", {
  whiteSpace: "revert",
});

globalStyle("meter", {
  WebkitAppearance: "revert",
  appearance: "revert",
});

globalStyle("::placeholder", {
  color: "unset",
});

globalStyle(":where([hidden])", {
  display: "none",
});

globalStyle(':where([contenteditable]:not([contenteditable="false"]))', {
  MozUserModify: "read-write",
  WebkitUserModify: "read-write",
  overflowWrap: "break-word",
  WebkitUserSelect: "auto",
});

globalStyle(':where([draggable="true"])', {
  // @ts-expect-error csstype doesn't seem to accept this value despite it being a valid webkit CSS property
  WebkitUserDrag: "element",
});
