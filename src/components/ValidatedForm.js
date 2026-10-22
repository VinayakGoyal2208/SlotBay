import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from "react";
import { fieldErrors } from "@/lib/validation";
import { ValidationContext } from "@/lib/form-context";
const control = (target) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;
export function ValidatedForm({ schema, values, onErrors, children, ...props }) {
  const lastInvalid = useRef(null);
  const checked = useRef(new Set());
  const validate = (field) => {
    const result = schema.safeParse(values);
    return result.success ? undefined : fieldErrors(result.error)[field];
  };
  const showErrors = () => {
    const result = schema.safeParse(values);
    const all = result.success ? {} : fieldErrors(result.error);
    onErrors(Object.fromEntries(Object.entries(all).filter(([key]) => checked.current.has(key))));
  };
  return _jsx(ValidationContext.Provider, {
    value: validate,
    children: _jsx("form", {
      ...props,
      noValidate: true,
      onBlurCapture: (e) => {
        const target = e.target;
        if (!control(target) || !target.name || target.disabled || target.readOnly) return;
        checked.current.add(target.name);
        const error = validate(target.name);
        lastInvalid.current = error ? target : null;
        if (control(e.relatedTarget)) showErrors();
      },
      onFocusCapture: (e) => {
        const invalid = lastInvalid.current;
        if (!invalid || !control(e.target) || !invalid.isConnected || !validate(invalid.name))
          return;
        const controls = Array.from(e.currentTarget.elements);
        if (controls.indexOf(e.target) > controls.indexOf(invalid)) {
          invalid.focus();
          invalid.setCustomValidity(validate(invalid.name) || "Correct this field");
          invalid.reportValidity();
          invalid.setCustomValidity("");
        }
      },
      onChangeCapture: (e) => {
        if (control(e.target)) e.target.setCustomValidity("");
      },
      children: children,
    }),
  });
}
