import { forwardRef, type ForwardedRef } from 'react';
import { Box, type Props as BoxProps } from '@crow/box';

type Direction = 'horizontal' | 'vertical';

const directionMap: Record<Direction, BoxProps['flexDirection']> = {
  horizontal: 'row',
  vertical: 'column',
};

export interface Props
  extends Omit<
    BoxProps,
    'alignItems' | 'justifyContent' | 'flexWrap' | 'wrap' | 'flexDirection'
  > {
  align?: BoxProps['alignItems'];
  direction?: Direction;
  justify?: BoxProps['justifyContent'];
  wrap?: boolean;
  opacity?: BoxProps['opacity'];
  onClick?: BoxProps['onClick'];
}

function Flex(
  { align, direction, justify, wrap, ...restProps }: Props,
  ref?: ForwardedRef<HTMLElement>
) {
  return (
    <Box
      alignItems={align}
      display="flex"
      flexDirection={direction ? directionMap[direction] : undefined}
      flexWrap={wrap ? 'wrap' : undefined}
      justifyContent={justify}
      ref={ref}
      {...restProps}
    />
  );
}

const Component = forwardRef(Flex);
Component.displayName = 'Flex';
export { Component as Flex };
