import { Flex } from "@crow/flex";
import { Text } from "@crow/text";
import { useTextField } from "@react-aria/textfield";
import { useObjectRef } from "@react-aria/utils";
import {
  type ChangeEventHandler,
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
} from "react";
import { autoResizeWrapperClass, textareaClasses } from "./index.css";

export interface Props {
  label?: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  validationState?: "valid" | "invalid";
  rows?: number;
  maxRows?: number;
  spellCheck?: boolean;
  multiline?: boolean;
  className?: string;
  font?: "sans" | "mono";
  resize?: "both" | "horizontal" | "vertical" | "none" | "auto";
  autoFocus?: boolean;
  name?: string;
  id?: string;
}

interface CSSVarProperties extends CSSProperties {
  "--max-rows": Props["maxRows"];
}

function Textarea(props: Props, ref?: ForwardedRef<HTMLTextAreaElement>) {
  const {
    label,
    description,
    errorMessage,
    placeholder,
    value,
    defaultValue,
    onChange,
    isDisabled,
    isReadOnly,
    isRequired,
    validationState,
    rows,
    maxRows,
    spellCheck,
    multiline = true,
    className,
    font,
    resize,
    autoFocus,
    name,
    id,
  } = props;

  const { labelProps, inputProps, descriptionProps, errorMessageProps } =
    useTextField(
      {
        inputElementType: "textarea",
        label,
        description,
        errorMessage,
        placeholder,
        value,
        defaultValue,
        onChange,
        isDisabled,
        isReadOnly,
        isRequired,
        validationState,
        autoFocus,
        name,
        id,
      },
      useObjectRef(ref),
    );

  const onInput: ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    if (!multiline) {
      // Strips out newline characters
      e.target.value = e.target.value.replace(/[\r\n\v]+/g, "");
    }

    if (inputProps.onInput) {
      inputProps.onInput(e);
    }
  };

  const classNames = [
    textareaClasses({
      font,
      resize,
      disabled: isDisabled,
      readOnly: isReadOnly,
      validationState,
    }),
    className,
  ]
    .join(" ")
    .trim();

  const textarea = (
    <textarea
      className={classNames}
      rows={rows}
      spellCheck={spellCheck}
      {...inputProps}
      onInput={onInput}
      ref={ref}
    />
  );

  return (
    <Flex gap={1} direction="vertical">
      {label && (
        // biome-ignore lint/a11y/noLabelWithoutControl: labelProps from useTextField includes htmlFor
        <label {...labelProps}>
          <Text weight="medium">{label}</Text>
        </label>
      )}
      {resize === "auto" ? (
        <div
          className={autoResizeWrapperClass}
          data-value={inputProps.value}
          style={
            { "--max-rows": maxRows ? maxRows : undefined } as CSSVarProperties
          }
        >
          {textarea}
        </div>
      ) : (
        textarea
      )}
      {description && (
        <div {...descriptionProps}>
          <Text color="stone600" size="sm">
            {description}
          </Text>
        </div>
      )}
      {errorMessage && (
        <div {...errorMessageProps}>
          <Text color="rust500" size="sm">
            {errorMessage}
          </Text>
        </div>
      )}
    </Flex>
  );
}

const Component = forwardRef(Textarea);
Component.displayName = "Textarea";
export { Component as Textarea };
