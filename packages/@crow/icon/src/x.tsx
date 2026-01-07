import { forwardRef, type ForwardedRef, type SVGProps } from 'react';
import { Icon, type Props as IconProps } from './icon';

const XSvg = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <line x1={18} y1={6} x2={6} y2={18} />
    <line x1={6} y1={6} x2={18} y2={18} />
  </svg>
);

function IconXComponent(
  props: Omit<IconProps, 'children'>,
  ref?: ForwardedRef<HTMLElement>
) {
  return (
    <Icon ref={ref} {...props}>
      <XSvg />
    </Icon>
  );
}

const Component = forwardRef(IconXComponent);
Component.displayName = 'IconX';
export { Component as IconX };
