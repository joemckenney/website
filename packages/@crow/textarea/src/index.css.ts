import { vars } from "@crow/theme";
import { style } from "@vanilla-extract/css";
import { type RecipeVariants, recipe } from "@vanilla-extract/recipes";

type CrowRecipeVariants<T extends ReturnType<typeof recipe>> = NonNullable<
  RecipeVariants<T>
>;

export const paddingY = vars.space[3];

const autoResizeMaxHeight = `calc(${vars.fontSizes.base.lineHeight} * var(--max-rows) + ${paddingY} * 2)`;

const textareaStyles = {
  minHeight: vars.space["10"],
  border: `${vars.borderWidths[1]} ${vars.borderStyles.solid} ${vars.colors.stone300}`,
  padding: `${vars.space["2"]} ${paddingY}`,
  fontSize: vars.fontSizes.base.fontSize,
  lineHeight: vars.fontSizes.base.lineHeight,
};

export const textareaClasses = recipe({
  base: {
    ...textareaStyles,
    background: vars.colors.white,
    borderRadius: vars.space["2"],
    boxSizing: "border-box",
    color: vars.colors.stone900,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    ":focus-visible": {
      borderColor: vars.colors.terracotta500,
      outline: `${vars.colors.terracotta500} ${vars.borderStyles.solid} ${vars.borderWidths[1]}`,
    },
    "::placeholder": {
      color: vars.colors.stone500,
    },
  },

  variants: {
    validationState: {
      valid: {},
      invalid: {
        borderColor: vars.colors.rust500,
        ":focus-visible": {
          borderColor: vars.colors.rust500,
          outlineColor: vars.colors.rust500,
        },
      },
    },
    disabled: {
      true: {
        opacity: vars.opacity[40],
        cursor: "not-allowed",
      },
    },
    readOnly: {
      true: {
        background: vars.colors.stone100,
        borderColor: vars.colors.stone100,
      },
    },
    font: {
      sans: {
        fontFamily: vars.fonts.sansText,
      },
      mono: {
        fontFamily: vars.fonts.mono,
      },
    },
    resize: {
      both: {
        resize: "both",
      },
      horizontal: {
        resize: "horizontal",
      },
      vertical: {
        resize: "vertical",
      },
      none: {
        resize: "none",
      },
      auto: {
        maxHeight: autoResizeMaxHeight,
        resize: "none",
        overflow: "hidden",
        gridArea: "1 / 1",
      },
    },
  },

  defaultVariants: {
    font: "sans",
    resize: "both",
  },
});

export type TextareaVariants = CrowRecipeVariants<typeof textareaClasses>;

export const autoResizeWrapperClass = style({
  display: "grid",
  maxHeight: autoResizeMaxHeight,

  // Styles cloned content to match actual textarea
  "::after": {
    ...textareaStyles,
    content: 'attr(data-value) " "',
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    visibility: "hidden",
    gridArea: "1 / 1",
  },
});
