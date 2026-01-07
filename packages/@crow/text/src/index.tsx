import { forwardRef, type ForwardedRef, type ReactNode, type ElementType } from 'react';
import { Box, type Props as BoxProps } from '@crow/box';
import { textClasses, type TextVariants } from './index.css';

export interface Props {
  as?: ElementType;
  children: ReactNode;
  font?: BoxProps['fontFamily'];
  size?: BoxProps['fontSize'];
  weight?: BoxProps['fontWeight'];
  textAlign?: BoxProps['textAlign'];
  textDecoration?: BoxProps['textDecoration'];
  textTransform?: BoxProps['textTransform'];
  color?: BoxProps['color'];
  truncate?: boolean | number;
  wrap?: boolean;
}

function Text(
  {
    as = 'span',
    children,
    color,
    font,
    size,
    textAlign,
    textDecoration,
    textTransform,
    truncate,
    wrap,
    weight,
  }: Props,
  ref?: ForwardedRef<HTMLElement>
) {
  return (
    <Box
      as={as}
      className={textClasses({
        truncate: !!truncate,
        wrap,
      })}
      fontFamily={font}
      fontSize={size}
      textAlign={textAlign}
      textTransform={textTransform}
      textDecoration={textDecoration}
      fontWeight={weight}
      color={color}
      style={{
        WebkitLineClamp: !!truncate
          ? typeof truncate == 'number'
            ? truncate
            : 1
          : 0,
      }}
      ref={ref}
    >
      {children}
    </Box>
  );
}

const Component = forwardRef(Text);
Component.displayName = 'Text';
export { Component as Text };
