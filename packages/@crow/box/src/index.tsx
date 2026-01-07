import {
  type ForwardedRef,
  type AllHTMLAttributes,
  type ElementType,
  createElement,
  forwardRef,
} from 'react';
import { utilClasses, type Utils } from './index.css';

export interface Props
  extends Omit<
      AllHTMLAttributes<HTMLElement>,
      'as' | 'color' | 'height' | 'width'
    >,
    Utils {
  as?: ElementType;
}

function Box({ as = 'div', ...props }: Props, ref?: ForwardedRef<HTMLElement>) {
  const utilProps: Record<string, unknown> = {};
  const nativeProps: Record<string, unknown> = {};

  for (const key in props) {
    if (utilClasses.properties.has(key as keyof Utils)) {
      utilProps[key] = props[key as keyof typeof props];
    } else {
      nativeProps[key] = props[key as keyof typeof props];
    }
  }

  const classNames = [props.className, utilClasses({ ...utilProps })]
    .join(' ')
    .trim();

  return createElement(as, {
    ...nativeProps,
    className: classNames,
    ref,
  });
}

const Component = forwardRef(Box);
Component.displayName = 'Box';
export { Component as Box };
export type { Utils as BoxUtils };
