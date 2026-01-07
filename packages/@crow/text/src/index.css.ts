import { type RecipeVariants, recipe } from "@vanilla-extract/recipes";

// Inlined from @bodo/utils - avoids external dependency
type CrowRecipeVariants<T extends ReturnType<typeof recipe>> = NonNullable<
  RecipeVariants<T>
>;

export const textClasses = recipe({
  variants: {
    truncate: {
      true: {
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        wordBreak: "break-all",
      },
    },
    wrap: {
      true: {
        wordBreak: "normal",
        overflowWrap: "anywhere",
      },
    },
  },
});

export type TextVariants = CrowRecipeVariants<typeof textClasses>;
