import { Box, type Props as BoxProps } from "@crow/box";
import type { Theme } from "@crow/theme";
import {
  cloneElement,
  type ForwardedRef,
  forwardRef,
  type ReactElement,
} from "react";

export interface Props {
  color?: BoxProps["color"];
  size?: keyof Theme["space"];
  strokeWidth?: 1 | 1.5 | 2;
  children: ReactElement<{
    height: string;
    width: string;
    strokeWidth: Props["strokeWidth"];
  }>;
}

function Icon(props: Props, ref?: ForwardedRef<HTMLElement>) {
  const { children, color, strokeWidth = 1.5, size = 6 } = props;
  return (
    <Box
      flexShrink={0}
      display="inline-flex"
      color={color}
      width={size}
      height={size}
      verticalAlign="top"
      ref={ref}
    >
      {cloneElement(children, {
        width: "100%",
        height: "100%",
        strokeWidth: strokeWidth,
      })}
    </Box>
  );
}

const Component = forwardRef(Icon);
Component.displayName = "Icon";
export { Component as Icon };
