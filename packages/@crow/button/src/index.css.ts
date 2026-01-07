import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { vars } from '@crow/theme';

type CrowRecipeVariants<T extends ReturnType<typeof recipe>> = NonNullable<RecipeVariants<T>>;

export const buttonClasses = recipe({
  base: {
    position: 'relative',
    boxSizing: 'border-box',
    display: 'inline-flex',
    height: vars.space[10],
    justifyContent: 'center',
    alignItems: 'center',
    gap: vars.space[1],
    border: vars.borderWidths[0],
    borderRadius: vars.radii[2],
    padding: `${vars.space[2]} ${vars.space[3]}`,
    cursor: 'pointer',
    transitionProperty: 'border-color, background',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'ease',
    whiteSpace: 'nowrap',
    ':focus-visible': {
      outline: `${vars.colors.blurple500} ${vars.borderStyles.solid} ${vars.borderWidths[2]}`,
    },
  },

  variants: {
    variant: {
      default: {
        color: vars.colors.midnight500,
        background: vars.colors.white,
        border: `${vars.borderWidths[1]} ${vars.borderStyles.solid} ${vars.colors.gray200}`,
        selectors: {
          '&:enabled:hover': {
            borderColor: vars.colors.gray400,
            background: vars.colors.gray50,
          },
        },
      },
      primary: {
        color: vars.colors.white,
        background: vars.colors.blurple500,
        ':focus-visible': {
          outlineColor: vars.colors.blurple200,
        },
        selectors: {
          '&:enabled:hover': {
            background: vars.colors.blurple700,
          },
        },
      },
      danger: {
        color: vars.colors.white,
        background: vars.colors.burntOrange500,
        selectors: {
          '&:enabled:hover': {
            background: vars.colors.burntOrange700,
          },
        },
      },
      minimal: {
        color: vars.colors.blurple500,
        background: vars.colors.transparent,
        selectors: {
          '&:enabled:hover': {
            background: vars.colors.blurple50,
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
        cursor: 'not-allowed',
      },
    },
  },
});

export type ButtonVariants = CrowRecipeVariants<typeof buttonClasses>;
