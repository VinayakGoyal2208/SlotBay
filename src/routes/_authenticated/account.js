import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { submitChange } from "@/integrations/api/client";
import { uploadDoc } from "@/integrations/api/client";
import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { FormField, inputCls } from "@/components/Form";
import { api } from "@/integrations/api/client";
import { useActionLock } from "@/lib/use-action-lock";
import { useMe } from "@/lib/auth";
import { driverSchema, fieldErrors, nameRule, phoneRule } from "@/lib/validation";
import { UploadPicker, FilePreview } from "@/components/UploadPicker";
import { DashboardHeading, LockedNotice, Timestamp } from "@/components/DashboardKit";
import { ValidatedForm } from "@/components/ValidatedForm";
import { RequestHistory } from "@/components/ChangeRequests";
export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { property: "og:url", content: SITE_URL + "/account" },
      { title: "My account — SlotBay" },
      { name: "description", content: "Your driver profile, vehicle and licence." },
      { property: "og:title", content: "My account — SlotBay" },
      { property: "og:description", content: "Your driver profile, vehicle and licence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/account" }],
  }),
  component: Account,
});
function Account() {
  const me = useMe();
  const uid = me.user?.id;
  const action = useActionLock();
  const qc = useQueryClient();
  const driver = useQuery({
    queryKey: ["driver", uid],
    enabled: !!uid && me.profile?.account_type === "user",
    queryFn: async () =>
      (
        await api
          .from("driver_details")
          .eq("user_id", uid ?? "")
          .maybeSingle()
      ).data,
  });
  const [profileEdit, setProfileEdit] = useState(false);
  const [vehicleEdit, setVehicleEdit] = useState(false);
  const [profileDraft, setP] = useState(null);
  const p = profileDraft ?? {
    full_name: me.profile?.full_name ?? "",
    phone: me.profile?.phone ?? "",
    message: "",
  };
  const [vehicleDraft, setD] = useState(null);
  const d = vehicleDraft ?? {
    vehicle_type: driver.data?.vehicle_type ?? "4W",
    plate: driver.data?.plate ?? "",
    licence_number: driver.data?.licence_number ?? "",
    message: "",
  };
  const [licence, setLicence] = useState([]);
  const [rc, setRc] = useState([]);
  const [licenceDraft, setRetainedLicence] = useState(null);
  const retainedLicence =
    licenceDraft ?? (driver.data?.licence_path ? [driver.data.licence_path] : []);
  const [rcDraft, setRetainedRc] = useState(null);
  const retainedRc = rcDraft ?? (driver.data?.rc_path ? [driver.data.rc_path] : []);
  const [err, setErr] = useState({});
  const requestSchema = z.object({
    full_name: nameRule,
    phone: phoneRule,
    message: z
      .string()
      .trim()
      .min(10, "Describe the correction in at least 10 characters")
      .max(1000),
  });
  const vehicleSchema = vehicleEdit
    ? driverSchema.and(
        z.object({
          message: z.string().trim().min(10, "Describe why this needs changing").max(1000),
        }),
      )
    : driverSchema;
  const saveDriver = (e) => {
    e.preventDefault();
    void action.run(async () => {
      const r = vehicleSchema.safeParse(d);
      const errors = r.success ? {} : fieldErrors(r.error);
      if (!licence.length && !retainedLicence.length)
        errors["licence"] = "Add your driving licence copy";
      if (!rc.length && !retainedRc.length) errors["rc"] = "Add your vehicle RC copy";
      setErr(errors);
      if (Object.keys(errors).length || !r.success || !uid) return;
      const licence_path = licence[0]
        ? await uploadDoc("documents", uid, "licence", licence[0])
        : retainedLicence[0];
      const rc_path = rc[0]
        ? await uploadDoc("documents", uid, "vehicle-rc", rc[0])
        : retainedRc[0];
      const payload = { ...driverSchema.parse(d), licence_path, rc_path };
      if (vehicleEdit) {
        await submitChange("vehicle", d.message, payload);
        toast.success("Vehicle correction sent to the administrator");
        setVehicleEdit(false);
        await qc.invalidateQueries({ queryKey: ["change-requests"] });
      } else {
        const { error } = await api.from("driver_details").upsert({ user_id: uid, ...payload });
        if (error) throw error;
        toast.success("Documents saved. You can book immediately.");
      }
      setLicence([]);
      setRc([]);
      await driver.refetch();
    });
  };
  const saveProfile = (e) => {
    e.preventDefault();
    const r = requestSchema.safeParse(p);
    if (!r.success) {
      setErr(fieldErrors(r.error));
      return;
    }
    void action.run(async () => {
      await submitChange("profile", r.data.message, {
        full_name: r.data.full_name,
        phone: r.data.phone,
      });
      toast.success("Profile correction sent to the administrator");
      setProfileEdit(false);
      await qc.invalidateQueries({ queryKey: ["change-requests"] });
    });
  };
  if (me.loading || !me.profile)
    return _jsx(SiteShell, {
      children: _jsx("p", { className: "p-10", children: "Loading your profile\u2026" }),
    });
  const role = me.profile.account_type;
  const complete = !!driver.data?.licence_path && !!driver.data.rc_path;
  const restricted = driver.data?.status === "rejected";
  return _jsx(SiteShell, {
    children: _jsxs("div", {
      className: "mx-auto max-w-5xl space-y-7 px-5 py-8",
      children: [
        _jsx(DashboardHeading, {
          eyebrow: `${role === "user" ? "Driver" : role} account`,
          title: "Profile & support",
          description:
            "Your identity and vehicle details stay linked to this account. Use a change request if something needs correcting.",
          actions: _jsx(Button, {
            asChild: true,
            variant: "outline",
            children: _jsx(Link, { to: "/dashboard", children: "Go to dashboard" }),
          }),
        }),
        _jsxs("section", {
          className: "space-y-4 rounded-2xl border bg-card p-6",
          children: [
            _jsxs("div", {
              className: "flex flex-wrap items-center justify-between gap-3",
              children: [
                _jsxs("div", {
                  children: [
                    _jsx("h2", { className: "text-xl font-bold", children: me.profile.full_name }),
                    _jsxs("p", {
                      className: "mt-1 text-sm text-muted-foreground",
                      children: [
                        me.profile.email,
                        " \u00B7 ",
                        me.profile.phone || "No mobile on file",
                      ],
                    }),
                  ],
                }),
                role !== "admin" &&
                  _jsx(Button, {
                    variant: "outline",
                    onClick: () => {
                      setP(null);
                      setProfileEdit(!profileEdit);
                      setErr({});
                    },
                    children: profileEdit
                      ? "Close correction form"
                      : "Request a profile correction",
                  }),
              ],
            }),
            _jsx(Timestamp, { label: "Registered", value: me.profile.created_at }),
            _jsx(LockedNotice, {}),
            profileEdit &&
              _jsxs(ValidatedForm, {
                schema: requestSchema,
                values: p,
                onErrors: setErr,
                onSubmit: saveProfile,
                className: "grid gap-4 rounded-xl border p-4 sm:grid-cols-2",
                children: [
                  _jsx(FormField, {
                    field: "full_name",
                    label: "Correct full name",
                    error: err["full_name"],
                    children: _jsx("input", {
                      required: true,
                      maxLength: 100,
                      value: p.full_name,
                      onChange: (e) => setP({ ...p, full_name: e.target.value }),
                      className: inputCls,
                    }),
                  }),
                  _jsx(FormField, {
                    field: "phone",
                    label: "Correct mobile number",
                    error: err["phone"],
                    children: _jsx("input", {
                      required: true,
                      maxLength: 10,
                      inputMode: "numeric",
                      value: p.phone,
                      onChange: (e) => setP({ ...p, phone: e.target.value.replace(/\D/g, "") }),
                      className: inputCls,
                    }),
                  }),
                  _jsx("div", {
                    className: "sm:col-span-2",
                    children: _jsx(FormField, {
                      field: "message",
                      label: "Explain the correction",
                      error: err["message"],
                      children: _jsx("textarea", {
                        required: true,
                        minLength: 10,
                        maxLength: 1000,
                        rows: 3,
                        value: p.message,
                        onChange: (e) => setP({ ...p, message: e.target.value }),
                        className: inputCls,
                      }),
                    }),
                  }),
                  _jsx(Button, {
                    disabled: action.pending,
                    type: "submit",
                    children: "Send to administrator",
                  }),
                ],
              }),
          ],
        }),
        role === "user" &&
          _jsxs("section", {
            className: "space-y-4 rounded-2xl border bg-card p-6",
            children: [
              _jsxs("div", {
                className: "flex flex-wrap items-center justify-between gap-3",
                children: [
                  _jsxs("div", {
                    children: [
                      _jsx("h2", {
                        className: "text-xl font-bold",
                        children: "Driving licence & vehicle RC",
                      }),
                      _jsx("p", {
                        className: "mt-1 text-sm text-muted-foreground",
                        children: "Carry both documents when you arrive to park.",
                      }),
                    ],
                  }),
                  driver.data &&
                    _jsx(Button, {
                      variant: "outline",
                      onClick: () => {
                        setD(null);
                        setRetainedLicence(null);
                        setRetainedRc(null);
                        setLicence([]);
                        setRc([]);
                        setVehicleEdit(!vehicleEdit);
                        setErr({});
                        setLicence([]);
                        setRc([]);
                        setRetainedLicence(
                          driver.data?.licence_path ? [driver.data.licence_path] : [],
                        );
                        setRetainedRc(driver.data?.rc_path ? [driver.data.rc_path] : []);
                      },
                      children: vehicleEdit
                        ? "Close correction form"
                        : "Request a vehicle / ID correction",
                    }),
                ],
              }),
              driver.error &&
                _jsxs("p", {
                  role: "alert",
                  children: [
                    "Could not load vehicle details.",
                    " ",
                    _jsx(Button, { onClick: () => driver.refetch(), children: "Retry" }),
                  ],
                }),
              restricted &&
                _jsxs("p", {
                  className: "rounded-xl border border-destructive/40 p-4 text-sm",
                  children: [
                    "This driver record is restricted.",
                    " ",
                    _jsxs("details", {
                      className: "mt-2",
                      children: [
                        _jsx("summary", { children: "View administrator\u2019s reason" }),
                        driver.data?.admin_note ??
                          "Contact the administrator through a change request.",
                      ],
                    }),
                  ],
                }),
              complete && !vehicleEdit
                ? _jsxs(_Fragment, {
                    children: [
                      _jsxs(LockedNotice, {
                        children: [
                          "Vehicle details are saved and locked.",
                          " ",
                          restricted
                            ? "Submit a correction to resolve the restriction."
                            : "You can reserve immediately, without approval.",
                        ],
                      }),
                      _jsxs("details", {
                        className: "rounded-xl border p-4",
                        children: [
                          _jsxs("summary", {
                            className: "font-semibold",
                            children: ["View vehicle & ID details \u00B7 ", driver.data?.plate],
                          }),
                          _jsxs("div", {
                            className: "mt-4 grid gap-4 text-sm sm:grid-cols-2",
                            children: [
                              _jsxs("div", {
                                children: [
                                  _jsxs("p", {
                                    children: [
                                      driver.data?.vehicle_type === "4W"
                                        ? "Car / 4-wheeler"
                                        : "2-wheeler",
                                      " \u00B7",
                                      " ",
                                      driver.data?.plate,
                                    ],
                                  }),
                                  _jsxs("p", {
                                    className: "mt-2",
                                    children: ["Driving licence: ", driver.data?.licence_number],
                                  }),
                                  _jsx(Timestamp, {
                                    label: "Registered",
                                    value: driver.data?.created_at,
                                  }),
                                  _jsx(Timestamp, {
                                    label: "Updated",
                                    value: driver.data?.updated_at,
                                  }),
                                ],
                              }),
                              _jsxs("div", {
                                className: "flex gap-4",
                                children: [
                                  _jsx(FilePreview, {
                                    path: driver.data?.licence_path,
                                    label: "Driving licence",
                                  }),
                                  _jsx(FilePreview, {
                                    path: driver.data?.rc_path,
                                    label: "Vehicle RC",
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  })
                : !driver.isLoading &&
                  (!restricted || vehicleEdit) &&
                  _jsxs(ValidatedForm, {
                    schema: vehicleSchema,
                    values: d,
                    onErrors: setErr,
                    onSubmit: saveDriver,
                    className: "space-y-5",
                    children: [
                      _jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children: vehicleEdit
                          ? "Propose corrected details and attach supporting documents. The administrator will review this report."
                          : "Add your document copies once. Your registered numbers remain locked, and no approval wait is required.",
                      }),
                      _jsxs("div", {
                        className: "grid gap-4 sm:grid-cols-3",
                        children: [
                          _jsx(FormField, {
                            field: "vehicle_type",
                            label: "Vehicle type",
                            children: _jsxs("select", {
                              disabled: !!driver.data && !vehicleEdit,
                              value: d.vehicle_type,
                              onChange: (e) => setD({ ...d, vehicle_type: e.target.value }),
                              className: inputCls,
                              children: [
                                _jsx("option", { value: "4W", children: "Car / 4-wheeler" }),
                                _jsx("option", { value: "2W", children: "2-wheeler" }),
                              ],
                            }),
                          }),
                          _jsx(FormField, {
                            field: "plate",
                            label: "Vehicle number",
                            error: err["plate"],
                            children: _jsx("input", {
                              readOnly: !!driver.data && !vehicleEdit,
                              maxLength: 12,
                              value: d.plate,
                              onChange: (e) =>
                                setD({
                                  ...d,
                                  plate: e.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase(),
                                }),
                              className: inputCls,
                            }),
                          }),
                          _jsx(FormField, {
                            field: "licence_number",
                            label: "Driving licence number",
                            error: err["licence_number"],
                            children: _jsx("input", {
                              readOnly: !!driver.data && !vehicleEdit,
                              maxLength: 15,
                              value: d.licence_number,
                              onChange: (e) =>
                                setD({
                                  ...d,
                                  licence_number: e.target.value
                                    .replace(/[^a-z0-9]/gi, "")
                                    .toUpperCase(),
                                }),
                              className: inputCls,
                            }),
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        className: "grid gap-4 sm:grid-cols-2",
                        children: [
                          _jsx(FormField, {
                            label: "Driving licence copy",
                            error: err["licence"],
                            children: _jsx(UploadPicker, {
                              label: "Driving licence copy",
                              pdf: true,
                              files: licence,
                              onChange: setLicence,
                              existing: retainedLicence,
                              ...(vehicleEdit
                                ? { onRemoveExisting: () => setRetainedLicence([]) }
                                : {}),
                            }),
                          }),
                          _jsx(FormField, {
                            label: "Vehicle RC copy",
                            error: err["rc"],
                            children: _jsx(UploadPicker, {
                              label: "Vehicle RC copy",
                              pdf: true,
                              files: rc,
                              onChange: setRc,
                              existing: retainedRc,
                              ...(vehicleEdit ? { onRemoveExisting: () => setRetainedRc([]) } : {}),
                            }),
                          }),
                        ],
                      }),
                      vehicleEdit &&
                        _jsx(FormField, {
                          field: "message",
                          label: "Reason for correction",
                          error: err["message"],
                          children: _jsx("textarea", {
                            maxLength: 1000,
                            minLength: 10,
                            required: true,
                            rows: 3,
                            value: d.message,
                            onChange: (e) => setD({ ...d, message: e.target.value }),
                            className: inputCls,
                          }),
                        }),
                      _jsx(Button, {
                        disabled: action.pending,
                        type: "submit",
                        children: action.pending
                          ? "Saving…"
                          : vehicleEdit
                            ? "Submit change request"
                            : "Save documents & start booking",
                      }),
                    ],
                  }),
            ],
          }),
        role === "owner" &&
          _jsxs("section", {
            className: "rounded-2xl border bg-card p-6",
            children: [
              _jsx("h2", {
                className: "text-xl font-bold",
                children: "Owner identity & payout details",
              }),
              _jsx("p", {
                className: "my-3 text-sm text-muted-foreground",
                children:
                  "View your private documents or submit a correction from your owner profile.",
              }),
              _jsx(Button, {
                asChild: true,
                variant: "outline",
                children: _jsx(Link, { to: "/owner", children: "Open owner profile" }),
              }),
            ],
          }),
        role !== "admin" && _jsx(RequestHistory, {}),
      ],
    }),
  });
}
