import { vars } from "@crow/theme";
import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";

const flexAlignment = ["flex-start", "center", "flex-end", "stretch"] as const;

const flexibility = [0, 1, 2, 3, 4] as const;

const space = vars.space;

const margins = {
  ...space,
};

const responsiveProperties = defineProperties({
  properties: {
    alignItems: [...flexAlignment, "baseline"],
    alignSelf: [...flexAlignment, "baseline"],
    borderRadius: vars.radii,
    borderBottomLeftRadius: vars.radii,
    borderBottomRightRadius: vars.radii,
    borderTopLeftRadius: vars.radii,
    borderTopRightRadius: vars.radii,
    borderStyle: vars.borderStyles,
    borderWidth: vars.borderWidths,
    bottom: vars.space,
    boxShadow: vars.shadows,
    display: [
      "block",
      "flex",
      "inline-flex",
      "inline",
      "grid",
      "inline-block",
      "none",
      "contents",
    ],
    flex: {
      1: "1 1 0%",
      auto: "1 1 auto",
      initial: "0 1 auto",
      none: "none",
    },
    flexBasis: {
      ...vars.space,
    },
    flexDirection: ["column", "row"],
    flexGrow: flexibility,
    flexShrink: flexibility,
    flexWrap: ["wrap", "nowrap"],
    fontSize: {
      ...vars.fontSizes,
      inherit: "inherit",
    },
    fontWeight: vars.fontWeights,
    gap: vars.space,
    height: vars.space,
    inset: vars.space,
    justifyContent: [...flexAlignment, "space-around", "space-between"],
    justifySelf: flexAlignment,
    left: vars.space,
    marginBottom: margins,
    marginLeft: margins,
    marginRight: margins,
    marginTop: margins,
    maxHeight: vars.space,
    maxWidth: {
      ...vars.space,
      none: "none",
    },
    minHeight: vars.space,
    minWidth: vars.space,
    overflow: ["auto", "hidden", "scroll", "unset"],
    paddingBottom: vars.space,
    paddingLeft: vars.space,
    paddingRight: vars.space,
    paddingTop: vars.space,
    position: ["absolute", "fixed", "relative", "sticky"],
    right: vars.space,
    textAlign: ["center", "left", "right"],
    top: vars.space,
    width: {
      ...vars.space,
    },
  },
  shorthands: {
    borderLeftRadius: ["borderBottomLeftRadius", "borderTopLeftRadius"],
    borderRightRadius: ["borderBottomRightRadius", "borderTopRightRadius"],
    borderTopRadius: ["borderTopLeftRadius", "borderTopRightRadius"],
    borderBottomRadius: ["borderBottomLeftRadius", "borderBottomRightRadius"],
    margin: ["marginTop", "marginBottom", "marginLeft", "marginRight"],
    marginX: ["marginLeft", "marginRight"],
    marginY: ["marginTop", "marginBottom"],
    padding: ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"],
    paddingX: ["paddingLeft", "paddingRight"],
    paddingY: ["paddingTop", "paddingBottom"],
  },
});

const unresponsiveProperties = defineProperties({
  properties: {
    aspectRatio: {
      auto: "auto",
      "1/1": "1 / 1",
      "2/1": "2 / 1",
      "4/1": "4 / 1",
      "4/3": "4 / 3",
      "16/9": "16 / 9",
    },
    cursor: ["default", "pointer", "not-allowed"],
    fontFamily: vars.fonts,
    isolation: ["isolate"],
    objectFit: ["contain", "cover"],
    opacity: vars.opacity,
    pointerEvents: ["none"],
    textDecoration: ["none", "underline", "line-through"],
    textTransform: ["capitalize", "lowercase", "uppercase"],
    transitionProperty: {
      none: "none",
      all: "all",
      default:
        "background-color, border-color, color, fill, stroke, opacity, box-shadow, transform",
      colors: "background-color, border-color, color, fill, stroke",
      opacity: "opacity",
      shadow: "box-shadow",
      transform: "transform",
    },
    transitionTimingFunction: {
      linear: "linear",
      in: "cubic-bezier(0.4, 0, 1, 1)",
      out: "cubic-bezier(0, 0, 0.2, 1)",
      inOut: "cubic-bezier(0.42, 0, 0.58, 1)",
    },
    verticalAlign: ["baseline", "top", "middle", "bottom"],
    visibility: ["hidden", "visible"],
    whiteSpace: [
      "normal",
      "nowrap",
      "pre",
      "pre-line",
      "pre-wrap",
      "initial",
      "inherit",
    ],
    wordBreak: ["break-word"],
    wordWrap: ["normal", "break-word", "initial", "inherit"],
    zIndex: vars.zIndexes,
  },
});

const selectorProperties = defineProperties({
  properties: {
    backgroundColor: vars.colors,
    borderColor: vars.colors,
    color: vars.colors,
    outlineColor: vars.colors,
  },
});

export const utilClasses = createSprinkles(
  responsiveProperties,
  unresponsiveProperties,
  selectorProperties,
);
export type Utils = Parameters<typeof utilClasses>[0];
