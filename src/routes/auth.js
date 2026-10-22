import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { SITE_URL } from "@/lib/site";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CarFront,
  Building2,
  ArrowRight,
  ArrowLeft,
  LockKeyhole,
  LoaderCircle,
} from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { FormField, inputCls } from "@/components/Form";
import { PasswordField } from "@/components/PasswordField";
import { api } from "@/integrations/api/client";
import {
  emailRule,
  nameRule,
  phoneRule,
  passwordRule,
  fieldErrors,
  signupSchema,
  driverSchema,
} from "@/lib/validation";
import { ValidatedForm } from "@/components/ValidatedForm";
import { useActionLock } from "@/lib/use-action-lock";
import { z } from "zod";
import { AuthCompanion } from "@/components/AuthCompanion";
export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { property: "og:url", content: SITE_URL + "/auth" },
      { title: "Sign in or join — SlotBay" },
      {
        name: "description",
        content: "Sign in to reserve parking, or register as a driver or parking owner.",
      },
      { property: "og:title", content: "Sign in or join — SlotBay" },
      { property: "og:description", content: "Driver and owner accounts for SlotBay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/auth" }],
  }),
  component: AuthPage,
});
const personalSchema = z.object({
  full_name: nameRule,
  phone: phoneRule,
  account_type: z.enum(["user", "owner"]),
});
const securitySchema = z
  .object({ email: emailRule, password: passwordRule, confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });
function AuthPage() {
  const nav = useNavigate();
  const action = useActionLock();
  const [mode, setMode] = useState("in");
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    account_type: "user",
    vehicle_type: "4W",
    plate: "",
    licence_number: "",
  });
  const [err, setErr] = useState({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(null);
  const successTitle = useRef(null);
  useEffect(() => {
    if (!success) return;
    successTitle.current?.focus();
    const timer = window.setTimeout(() => {
      void nav({
        to: success === "login" ? "/dashboard" : f.account_type === "owner" ? "/owner" : "/account",
        replace: true,
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [success, f.account_type, nav]);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const lastStep = f.account_type === "user" ? 2 : 1;
  const schema =
    mode === "up"
      ? [personalSchema, securitySchema, driverSchema][step]
      : z.object({ email: emailRule, password: z.string().min(1, "Enter your password") });
  const set = (key) => (event) => {
    let value = event.target.value;
    if (key === "phone") value = value.replace(/\D/g, "").slice(0, 10);
    if (["plate", "licence_number"].includes(key))
      value = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
    setF({ ...f, [key]: value });
    setErr((old) => ({ ...old, [key]: "" }));
    setFormError("");
  };
  useEffect(() => {
    api.auth.getUser().then(({ data }) => {
      if (data.user) void nav({ to: "/dashboard" });
    });
  }, [nav]);
  const submit = (event) => {
    event.preventDefault();
    setFormError("");
    const parsed = schema.safeParse(f);
    if (!parsed.success) {
      setErr(fieldErrors(parsed.error));
      return;
    }
    if (mode === "up" && step < lastStep) {
      setStep(step + 1);
      setErr({});
      setPasswordFocus(false);
      return;
    }
    void action.run(async () => {
      try {
        if (mode === "up") {
          const result = signupSchema
            .and(f.account_type === "user" ? driverSchema : z.object({}))
            .safeParse(f);
          if (!result.success) {
            const errors = fieldErrors(result.error);
            setErr(errors);
            setStep(
              errors["full_name"] || errors["phone"]
                ? 0
                : errors["email"] || errors["password"] || errors["confirm"]
                  ? 1
                  : 2,
            );
            return;
          }
          const r = signupSchema.parse(f),
            vehicle = f.account_type === "user" ? driverSchema.parse(f) : undefined;
          const { error } = await api.auth.signUp({
            email: r.email,
            password: r.password,
            options: {
              data: {
                full_name: r.full_name,
                phone: r.phone,
                account_type: r.account_type,
                ...(vehicle ? { vehicle } : {}),
              },
            },
          });
          if (error) throw error;
          setSuccess("registered");
          return;
        }
        const { error } = await api.auth.signInWithPassword({
          email: f.email,
          password: f.password,
        });
        if (error) throw error;
        setSuccess("login");
      } catch (error) {
        setFormError(error.message || "Please try again in a moment.");
      }
    });
  };
  const changeMode = (next) => {
    setMode(next);
    setStep(0);
    setErr({});
    setFormError("");
    setPasswordFocus(false);
  };
  return _jsx(SiteShell, {
    children: _jsxs("div", {
      className: `auth-page auth-website auth-mode-${mode}`,
      children: [
        _jsxs("aside", {
          className: "auth-art",
          "aria-label": "Welcome to SlotBay",
          children: [
            _jsxs("div", {
              className: "auth-art-copy",
              children: [
                _jsx("p", { className: "auth-eyebrow", children: "A little less circling." }),
                _jsxs("h2", { children: ["Good journeys", _jsx("br", {}), "start here."] }),
                _jsx("p", {
                  children: "Your parking, your plans, and one less thing to think about.",
                }),
              ],
            }),
            _jsx("div", {
              className: "auth-creatures",
              children: _jsx(AuthCompanion, {
                hiding: passwordFocus,
                invalid: Object.values(err).some(Boolean) || !!formError,
              }),
            }),
            _jsx("p", { className: "auth-art-caption", children: "Park closer. Arrive calmer." }),
          ],
        }),
        _jsx("section", {
          className: "auth-form-panel",
          children: _jsx(
            "div",
            {
              className: "auth-form-content",
              children: success
                ? _jsxs("div", {
                    className: "auth-success",
                    children: [
                      _jsxs("svg", {
                        className: "auth-success-mark",
                        viewBox: "0 0 80 80",
                        "aria-hidden": "true",
                        children: [
                          _jsx("circle", { cx: "40", cy: "40", r: "34" }),
                          _jsx("path", { d: "M24 41l11 11 23-25" }),
                        ],
                      }),
                      _jsx("p", {
                        className: "auth-eyebrow",
                        children: success === "login" ? "Welcome back" : "A fresh start",
                      }),
                      _jsx("h1", {
                        ref: successTitle,
                        tabIndex: -1,
                        children: success === "login" ? "You’re signed in" : "Account created",
                      }),
                      _jsx("p", {
                        role: "status",
                        children:
                          success === "login"
                            ? "Everything is ready. Let’s get you to your dashboard."
                            : f.account_type === "owner"
                              ? "Admin verification is pending. Submit your owner documents next. We’ll notify you when your application is approved."
                              : "Your profile is ready and your registered details are locked. Add your driving licence and vehicle RC copies to start booking.",
                      }),
                      _jsxs("p", {
                        className: "flex items-center gap-2 text-sm text-primary",
                        role: "status",
                        children: [
                          _jsx(LoaderCircle, {
                            className: "size-4 animate-spin motion-reduce:animate-none",
                            "aria-hidden": true,
                          }),
                          success === "login" ? "Opening your dashboard…" : "Opening your profile…",
                        ],
                      }),
                    ],
                  })
                : _jsxs(ValidatedForm, {
                    schema: schema,
                    values: f,
                    onErrors: setErr,
                    onSubmit: submit,
                    className: "auth-compact-form",
                    children: [
                      _jsxs("div", {
                        className: "auth-form-title",
                        children: [
                          _jsx("span", {
                            className: "auth-form-icon",
                            children: _jsx(LockKeyhole, {}),
                          }),
                          _jsx("p", {
                            className: "auth-eyebrow",
                            children: mode === "up" ? "Your place starts here" : "Welcome back",
                          }),
                          _jsx("h1", {
                            children: mode === "up" ? "Create an account" : "Sign in to SlotBay",
                          }),
                          _jsx("p", {
                            children:
                              mode === "up"
                                ? [
                                    "Tell us a little about yourself.",
                                    "Choose your sign-in details.",
                                    "Link your driving licence and vehicle.",
                                  ][step]
                                : "Your next parking spot is waiting.",
                          }),
                        ],
                      }),
                      mode === "up" &&
                        _jsxs("div", {
                          className: "auth-step-line",
                          children: [
                            _jsxs("span", { children: ["Step ", step + 1, " of ", lastStep + 1] }),
                            _jsx("span", {
                              children: ["Your details", "Account security", "Your vehicle"][step],
                            }),
                          ],
                        }),
                      mode === "up" &&
                        step === 0 &&
                        _jsxs(_Fragment, {
                          children: [
                            _jsx("div", {
                              className: "auth-role-choice",
                              children: [
                                ["user", "I’m a driver", CarFront],
                                ["owner", "I own parking", Building2],
                              ].map(([value, label, Icon]) =>
                                _jsxs(
                                  "button",
                                  {
                                    type: "button",
                                    "aria-pressed": f.account_type === value,
                                    onClick: () => setF({ ...f, account_type: value }),
                                    children: [_jsx(Icon, {}), label],
                                  },
                                  value,
                                ),
                              ),
                            }),
                            _jsx(FormField, {
                              field: "full_name",
                              label: "Full name (as on your ID)",
                              error: err["full_name"],
                              children: _jsx("input", {
                                className: inputCls,
                                required: true,
                                maxLength: 100,
                                value: f.full_name,
                                onChange: set("full_name"),
                                autoComplete: "name",
                              }),
                            }),
                            _jsx(FormField, {
                              field: "phone",
                              label: "Mobile number",
                              error: err["phone"],
                              children: _jsx("input", {
                                className: inputCls,
                                required: true,
                                inputMode: "numeric",
                                maxLength: 10,
                                pattern: "[6-9][0-9]{9}",
                                value: f.phone,
                                onChange: set("phone"),
                                autoComplete: "tel-national",
                                placeholder: "10-digit mobile number",
                              }),
                            }),
                          ],
                        }),
                      (mode !== "up" || step === 1) &&
                        _jsx(FormField, {
                          field: "email",
                          label: "Email address",
                          error: err["email"],
                          children: _jsx("input", {
                            className: inputCls,
                            type: "email",
                            required: true,
                            maxLength: 255,
                            autoComplete: "email",
                            value: f.email,
                            onChange: set("email"),
                            placeholder: "you@example.com",
                          }),
                        }),
                      (mode === "in" || (mode === "up" && step === 1)) &&
                        _jsx(PasswordField, {
                          name: "password",
                          value: f.password,
                          onChange: set("password"),
                          error: err["password"],
                          hint:
                            mode === "up"
                              ? "8–72 characters, uppercase, lowercase and a number"
                              : undefined,
                          autoComplete: mode === "up" ? "new-password" : "current-password",
                          onFocus: () => setPasswordFocus(true),
                          onBlur: () => setPasswordFocus(false),
                        }),
                      mode === "up" &&
                        step === 1 &&
                        _jsx(PasswordField, {
                          name: "confirm",
                          label: "Confirm password",
                          value: f.confirm,
                          onChange: set("confirm"),
                          error: err["confirm"],
                          autoComplete: "new-password",
                          onFocus: () => setPasswordFocus(true),
                          onBlur: () => setPasswordFocus(false),
                        }),
                      mode === "up" &&
                        step === 2 &&
                        _jsxs(_Fragment, {
                          children: [
                            _jsx(FormField, {
                              field: "vehicle_type",
                              label: "Vehicle type",
                              children: _jsxs("select", {
                                className: inputCls,
                                value: f.vehicle_type,
                                onChange: set("vehicle_type"),
                                children: [
                                  _jsx("option", { value: "4W", children: "Car / 4-wheeler" }),
                                  _jsx("option", { value: "2W", children: "2-wheeler" }),
                                ],
                              }),
                            }),
                            _jsx(FormField, {
                              field: "plate",
                              label: "Vehicle registration number",
                              error: err["plate"],
                              children: _jsx("input", {
                                className: inputCls,
                                required: true,
                                maxLength: 12,
                                value: f.plate,
                                onChange: set("plate"),
                                placeholder: "KA01AB1234",
                              }),
                            }),
                            _jsx(FormField, {
                              field: "licence_number",
                              label: "Driving licence number",
                              error: err["licence_number"],
                              children: _jsx("input", {
                                className: inputCls,
                                required: true,
                                maxLength: 15,
                                value: f.licence_number,
                                onChange: set("licence_number"),
                                placeholder: "KA0120190001234",
                              }),
                            }),
                          ],
                        }),
                      formError &&
                        _jsx("p", {
                          role: "alert",
                          className: "auth-form-error",
                          children: formError,
                        }),
                      _jsxs("div", {
                        className: "auth-submit-row",
                        children: [
                          mode === "up" &&
                            step > 0 &&
                            _jsx(Button, {
                              type: "button",
                              variant: "outline",
                              disabled: action.pending,
                              onClick: () => {
                                setStep(step - 1);
                                setErr({});
                                setFormError("");
                                setPasswordFocus(false);
                              },
                              "aria-label": "Previous registration step",
                              children: _jsx(ArrowLeft, {}),
                            }),
                          _jsx(Button, {
                            type: "submit",
                            className: "auth-submit",
                            disabled: action.pending,
                            children: action.pending
                              ? _jsxs(_Fragment, {
                                  children: [
                                    _jsx(LoaderCircle, { className: "animate-spin" }),
                                    "Please wait\u2026",
                                  ],
                                })
                              : _jsxs(_Fragment, {
                                  children: [
                                    mode === "up"
                                      ? step < lastStep
                                        ? "Continue"
                                        : "Create account"
                                      : "Sign in",
                                    _jsx(ArrowRight, {}),
                                  ],
                                }),
                          }),
                        ],
                      }),
                      mode === "up" &&
                        step === lastStep &&
                        _jsx("p", {
                          className: "auth-registration-note",
                          children:
                            "Registered details are locked. Corrections go through the administrator.",
                        }),
                      _jsxs("p", {
                        className: "auth-switch",
                        children: [
                          mode === "in" ? "New to SlotBay? " : "Already have an account? ",
                          _jsx("button", {
                            type: "button",
                            disabled: action.pending,
                            onClick: () => changeMode(mode === "in" ? "up" : "in"),
                            children: mode === "in" ? "Create an account" : "Sign in",
                          }),
                        ],
                      }),
                    ],
                  }),
            },
            `${mode}-${step}-${success}`,
          ),
        }),
      ],
    }),
  });
}
