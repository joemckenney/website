import { forwardRef, type ElementType, type ForwardedRef } from 'react';
import { mergeProps, useObjectRef } from '@react-aria/utils';
import { useHover, usePress } from '@react-aria/interactions';
import type {
  AriaBaseButtonProps,
  ButtonProps,
  LinkButtonProps,
} from '@react-types/button';
import { Text } from '@crow/text';

import { buttonClasses, type ButtonVariants } from './index.css';

export interface Props<T extends ElementType = 'button'>
  extends AriaBaseButtonProps,
    ButtonProps,
    LinkButtonProps<T> {
  variant?: 'default' | 'primary' | 'danger' | 'minimal';
  width?: 'fit' | 'full';
}

function Button<T extends ElementType = 'button'>(
  props: Props<T>,
  ref?: ForwardedRef<HTMLButtonElement>
) {
  const {
    elementType: ElementType = 'button',
    children,
    isDisabled,
    variant = 'default',
    width = 'fit',
  } = props;

  const { pressProps } = usePress({
    onPressStart: (event) => {
      event.continuePropagation();
      props.onPressStart?.(event);
    },
    ...props,
    ref: useObjectRef(ref),
  });

  const { hoverProps } = useHover({ isDisabled });

  return (
    <ElementType
      className={buttonClasses({
        disabled: isDisabled,
        variant,
        width,
      })}
      ref={useObjectRef(ref)}
      {...mergeProps(pressProps, hoverProps)}
    >
      <Text weight="medium" color="inherit">
        {children}
      </Text>
    </ElementType>
  );
}

const Component = forwardRef(Button);
Component.displayName = 'Button';
export { Component as Button };
