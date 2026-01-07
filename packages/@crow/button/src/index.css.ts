import { vars } from "@crow/theme";
import { type RecipeVariants, recipe } from "@vanilla-extract/recipes";

type CrowRecipeVariants<T extends ReturnType<typeof recipe>> = NonNullable<
  RecipeVariants<T>
>;

export const buttonClasses = recipe({
  base: {
    position: "relative",
    boxSizing: "border-box",
    display: "inline-flex",
    height: vars.space[10],
    justifyContent: "center",
    alignItems: "center",
    gap: vars.space[1],
    border: vars.borderWidths[0],
    borderRadius: vars.radii[2],
    padding: `${vars.space[2]} ${vars.space[3]}`,
    cursor: "pointer",
    transitionProperty: "border-color, background",
    transitionDuration: "0.2s",
    transitionTimingFunction: "ease",
    whiteSpace: "nowrap",
    ":focus-visible": {
      outline: `${vars.colors.terracotta500} ${vars.borderStyles.solid} ${vars.borderWidths[2]}`,
    },
  },

  variants: {
    variant: {
      default: {
        color: vars.colors.stone900,
        background: vars.colors.white,
        border: `${vars.borderWidths[1]} ${vars.borderStyles.solid} ${vars.colors.stone300}`,
        selectors: {
          "&:enabled:hover": {
            borderColor: vars.colors.stone400,
            background: vars.colors.stone100,
          },
        },
      },
      primary: {
        color: vars.colors.white,
        background: vars.colors.terracotta500,
        ":focus-visible": {
          outlineColor: vars.colors.terracotta200,
        },
        selectors: {
          "&:enabled:hover": {
            background: vars.colors.terracotta600,
          },
        },
      },
      danger: {
        color: vars.colors.white,
        background: vars.colors.rust500,
        selectors: {
          "&:enabled:hover": {
            background: vars.colors.rust600,
          },
        },
      },
      minimal: {
        color: vars.colors.terracotta500,
        background: vars.colors.transparent,
        selectors: {
          "&:enabled:hover": {
            background: vars.colors.terracotta50,
          },
        },
      },
    },
    width: {
      fit: {
        width: vars.space.fit,
      },
      full: {
        width: vars.space.full,
      },
    },
    disabled: {
      true: {
        opacity: vars.opacity[40],
        cursor: "not-allowed",
      },
    },
  },
});

export type ButtonVariants = CrowRecipeVariants<typeof buttonClasses>;
