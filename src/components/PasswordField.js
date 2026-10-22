import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputCls } from "./Form";
export function PasswordField({
  name,
  label = "Password",
  value,
  onChange,
  error,
  hint,
  autoComplete = "current-password",
  onFocus,
  onBlur,
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return _jsxs("div", {
    className: "password-field",
    children: [
      _jsx("label", {
        htmlFor: id,
        className: "mb-1.5 block text-xs font-semibold",
        children: label,
      }),
      _jsxs("div", {
        className: "password-control",
        children: [
          _jsx("input", {
            id: id,
            name: name,
            className: inputCls,
            type: visible ? "text" : "password",
            required: true,
            maxLength: 72,
            value: value,
            onChange: onChange,
            autoComplete: autoComplete,
            onFocus: onFocus,
            onBlur: onBlur,
            "aria-invalid": !!error,
            "aria-describedby": error || hint ? `${id}-help` : undefined,
          }),
          _jsx("button", {
            type: "button",
            "aria-label": `${visible ? "Hide" : "Show"} ${label.toLowerCase()}`,
            "aria-pressed": visible,
            onPointerDown: (event) => event.preventDefault(),
            onClick: () => setVisible(!visible),
            children: visible
              ? _jsx(EyeOff, { "aria-hidden": "true" })
              : _jsx(Eye, { "aria-hidden": "true" }),
          }),
        ],
      }),
      error
        ? _jsx("p", {
            id: `${id}-help`,
            role: "alert",
            className: "mt-1 text-xs text-destructive",
            children: error,
          })
        : hint
          ? _jsx("p", {
              id: `${id}-help`,
              className: "mt-1 text-xs text-muted-foreground",
              children: hint,
            })
          : null,
    ],
  });
}
