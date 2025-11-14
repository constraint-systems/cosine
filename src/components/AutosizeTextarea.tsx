import { useEffect, useRef, forwardRef, TextareaHTMLAttributes } from "react";

interface AutosizeTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

export const AutosizeTextarea = forwardRef<HTMLTextAreaElement, AutosizeTextareaProps>(
  ({ minRows = 3, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";

      // Set height to scrollHeight to fit content
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    useEffect(() => {
      adjustHeight();
    }, [props.value]);

    return (
      <textarea
        ref={textareaRef}
        rows={minRows}
        {...props}
        onInput={(e) => {
          adjustHeight();
          props.onInput?.(e);
        }}
        style={{
          ...props.style,
          resize: "none",
          overflow: "hidden",
        }}
      />
    );
  }
);

AutosizeTextarea.displayName = "AutosizeTextarea";
