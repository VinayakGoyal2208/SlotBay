import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useDashboardFilter } from "@/lib/use-dashboard-filter";
import { submitChange } from "@/integrations/api/client";
import { uploadDoc } from "@/integrations/api/client";
import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { UploadPicker, FilePreview } from "@/components/UploadPicker";
import {
  DashboardHeading,
  DashboardSections,
  DashboardToolbar,
  MetricCards,
  BookingSummary,
  LockedNotice,
  Timestamp,
  EmptyState,
} from "@/components/DashboardKit";
import { ValidatedForm } from "@/components/ValidatedForm";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FormField, inputCls, StatusPill } from "@/components/Form";
import { api } from "@/integrations/api/client";
import { useActionLock } from "@/lib/use-action-lock";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useMe } from "@/lib/auth";
import { galleryFits } from "@/lib/listing-photos";
import { indiaDate } from "@/lib/availability";
import {
  checkFile,
  checkImageDimensions,
  fieldErrors,
  listingSchema,
  namesMatch,
  ownerSchema,
} from "@/lib/validation";
export const Route = createFileRoute("/_authenticated/owner")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { property: "og:url", content: SITE_URL + "/owner" },
      { title: "Owner dashboard — SlotBay" },
      { name: "description", content: "Verify your account, manage locations and track arrivals." },
      { property: "og:title", content: "Owner dashboard — SlotBay" },
      {
        property: "og:description",
        content: "Verify your account, manage locations and track arrivals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/owner" }],
  }),
  component: Owner,
});
function Owner() {
  const me = useMe();
  const uid = me.user?.id;
  const [editing, setEditing] = useState(false);
  const app = useQuery({
    queryKey: ["owner-app", uid],
    enabled: !!uid,
    queryFn: async () =>
      (
        await api
          .from("owner_applications")
          .eq("user_id", uid ?? "")
          .maybeSingle()
      ).data,
  });
  if (me.error || app.error)
    return _jsx(SiteShell, {
      children: _jsxs("p", {
        role: "alert",
        className: "p-10",
        children: [
          "Could not load your owner account.",
          " ",
          _jsx(Button, {
            onClick: () => {
              me.refetch();
              app.refetch();
            },
            children: "Retry",
          }),
        ],
      }),
    });
  if (!uid || me.loading || app.isLoading)
    return _jsx(SiteShell, {
      children: _jsx("p", { className: "p-10", children: "Loading your workspace\u2026" }),
    });
  if (me.profile?.account_type !== "owner")
    return _jsx(SiteShell, {
      children: _jsxs("div", {
        className: "p-10",
        children: [
          _jsx("h1", { className: "text-3xl font-bold", children: "Owner workspace" }),
          _jsx("p", { children: "This area is for parking owners." }),
          _jsx(Link, { to: "/dashboard", children: "Go to your dashboard" }),
        ],
      }),
    });
  const a = app.data;
  return _jsx(SiteShell, {
    children: _jsxs("div", {
      className: "mx-auto max-w-7xl space-y-6 px-5 py-8",
      children: [
        _jsx(DashboardHeading, {
          eyebrow: `Welcome, ${me.profile.full_name}`,
          title: "Your parking workspace",
          description:
            "Manage your locations, adjust bay capacity and see who is arriving. Available bays are reserved and confirmed immediately.",
          actions: _jsx(Button, {
            asChild: true,
            variant: "outline",
            children: _jsx(Link, { to: "/account", children: "Profile & support" }),
          }),
        }),
        _jsxs("details", {
          className: "rounded-xl border bg-card p-4",
          children: [
            _jsx("summary", { className: "font-semibold", children: "Notifications & updates" }),
            _jsx("div", { className: "mt-4", children: _jsx(NotificationCenter, {}) }),
          ],
        }),
        a &&
          _jsxs("details", {
            className: "rounded-xl border bg-card p-5",
            children: [
              _jsxs("summary", {
                className: "font-semibold",
                children: [
                  "Owner profile",
                  " ",
                  _jsx("span", {
                    className: "ml-2",
                    children: _jsx(StatusPill, { status: a.status }),
                  }),
                ],
              }),
              _jsxs("div", {
                className: "mt-5 space-y-4",
                children: [
                  _jsx(Timestamp, { label: "Registered", value: me.profile.created_at }),
                  _jsx(Timestamp, { label: "Submitted", value: a.submitted_at }),
                  a.reviewed_at && _jsx(Timestamp, { label: "Reviewed", value: a.reviewed_at }),
                  a.status === "approved" || a.locked_at
                    ? _jsx(LockedNotice, {
                        children:
                          "Approved owner details are locked. Submit a correction report if your identity, property or payout details need changing.",
                      })
                    : _jsx("p", {
                        className: "text-sm text-muted-foreground",
                        children:
                          a.status === "pending"
                            ? "Your owner documents are being reviewed."
                            : "Review the reason and correct your application.",
                      }),
                  a.admin_note &&
                    _jsxs("details", {
                      className: "text-sm",
                      children: [
                        _jsx("summary", { children: "View review reason" }),
                        _jsx("p", { className: "mt-2", children: a.admin_note }),
                      ],
                    }),
                  _jsxs("div", {
                    className: "grid gap-3 text-sm sm:grid-cols-2",
                    children: [
                      _jsxs("p", { children: ["Property: ", a.place_address] }),
                      _jsxs("p", {
                        children: ["ID: ", a.id_type?.toUpperCase(), " ", a.id_number],
                      }),
                      _jsxs("p", { children: ["Account holder: ", a.account_holder] }),
                      _jsxs("p", {
                        children: [
                          "Payout account: \u2022\u2022\u2022\u2022",
                          a.account_number?.slice(-4),
                          " \u00B7 ",
                          a.ifsc,
                        ],
                      }),
                    ],
                  }),
                  _jsxs("div", {
                    className: "flex flex-wrap gap-4",
                    children: [
                      a.id_doc_path &&
                        _jsx(FilePreview, { path: a.id_doc_path, label: "Identity document" }),
                      a.property_doc_path &&
                        _jsx(FilePreview, { path: a.property_doc_path, label: "Property proof" }),
                      a.photo_paths.map((path, i) =>
                        _jsx(FilePreview, { path: path, label: `Parking photo ${i + 1}` }, path),
                      ),
                    ],
                  }),
                  _jsx(Button, {
                    variant: "outline",
                    onClick: () => setEditing(!editing),
                    children: editing
                      ? "Close form"
                      : a.locked_at || a.status === "approved"
                        ? "Request an owner detail correction"
                        : "Correct / update submission",
                  }),
                ],
              }),
            ],
          }),
        (!a || editing) &&
          _jsx(OwnerApplication, {
            uid: uid,
            fullName: me.profile.full_name,
            existing: a ?? null,
            onDone: () => {
              setEditing(false);
              app.refetch();
            },
          }),
        a?.status === "approved" && me.isOwner
          ? _jsx(OwnerWorkspace, { uid: uid })
          : a &&
            !editing &&
            _jsx(EmptyState, {
              children:
                a.status === "pending"
                  ? "Your application is under review. Open Owner profile to check your submitted documents."
                  : "Open Owner profile to see the reason and submit a correction.",
            }),
      ],
    }),
  });
}
function OwnerApplication({ uid, fullName, existing, onDone }) {
  const applicationAction = useActionLock();
  const changeMode = !!existing?.locked_at || existing?.status === "approved";
  const [message, setMessage] = useState("");
  const [retainedId, setRetainedId] = useState(existing?.id_doc_path ? [existing.id_doc_path] : []);
  const [retainedProp, setRetainedProp] = useState(
    existing?.property_doc_path ? [existing.property_doc_path] : [],
  );
  const [retainedPhotos, setRetainedPhotos] = useState(existing?.photo_paths ?? []);
  const [f, setF] = useState({
    id_type: existing?.id_type ?? "aadhaar",
    id_number: existing?.id_number ?? "",
    property_doc_type: existing?.property_doc_type ?? "electricity_bill",
    place_address: existing?.place_address ?? "",
    account_holder: existing?.account_holder ?? fullName,
    account_number: existing?.account_number ?? "",
    confirm_account: existing?.account_number ?? "",
    ifsc: existing?.ifsc ?? "",
  });
  const [files, setFiles] = useState({ photos: [] });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    let value = e.target.value;
    if (["account_number", "confirm_account"].includes(k)) value = value.replace(/\D/g, "");
    if (k === "id_number")
      value = value.replace(f.id_type === "aadhaar" ? /\D/g : /[^a-z0-9]/gi, "").toUpperCase();
    if (k === "ifsc") value = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
    setF({ ...f, [k]: value });
    setErr((old) => ({ ...old, [k]: "" }));
  };
  const submit = async (e) => {
    e.preventDefault();
    const r = ownerSchema.safeParse(f);
    const er = r.success ? {} : fieldErrors(r.error);
    if (r.success && !namesMatch(r.data.account_holder, fullName))
      er["account_holder"] = `Account holder must match your registered name (${fullName})`;
    const idE =
      retainedId.length && !files.id
        ? null
        : checkFile(files.id, { pdf: true, label: "ID document" });
    if (idE) er["id_file"] = idE;
    const pE =
      retainedProp.length && !files.prop
        ? null
        : checkFile(files.prop, { pdf: true, label: "Property document" });
    if (pE) er["prop_file"] = pE;
    if (
      retainedPhotos.length + files.photos.length < 2 ||
      retainedPhotos.length + files.photos.length > 6
    )
      er["photos"] = "Upload 2 to 6 clear photos of the parking space";
    else
      for (const p of files.photos) {
        const fe = checkFile(p, { label: p.name }) ?? (await checkImageDimensions(p));
        if (fe) {
          er["photos"] = fe;
          break;
        }
      }
    const names = files.photos.map((p) => `${p.size}-${p.name}`);
    if (new Set(names).size !== names.length) er["photos"] = "Each photo must be different";
    if (changeMode && message.trim().length < 10)
      er["message"] = "Explain the change in at least 10 characters";
    setErr(er);
    if (Object.keys(er).length || !r.success) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setBusy(true);
    try {
      const id_doc_path = files.id
        ? await uploadDoc("documents", uid, "gov-id", files.id)
        : retainedId[0];
      const property_doc_path = files.prop
        ? await uploadDoc("documents", uid, "property", files.prop)
        : retainedProp[0];
      const photo_paths = [
        ...retainedPhotos,
        ...(await Promise.all(
          files.photos.map((p, i) => uploadDoc("documents", uid, `place-${i}`, p)),
        )),
      ];
      const { confirm_account: _c, ...data } = r.data;
      const row = {
        user_id: uid,
        ...data,
        id_number: data.id_number.replace(/[\s-]/g, "").toUpperCase(),
        id_doc_path,
        property_doc_path,
        photo_paths,
      };
      if (changeMode) {
        const { user_id: _, ...proposed } = row;
        await submitChange("owner", message, proposed);
        toast.success("Owner correction sent to administrator");
        onDone();
        return;
      }
      const { error } = existing
        ? await api.from("owner_applications").update(row).eq("user_id", uid)
        : await api.from("owner_applications").insert(row);
      if (error) throw error;
      toast.success("Submitted for admin verification");
      onDone();
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy(false);
    }
  };
  return _jsxs(ValidatedForm, {
    schema: ownerSchema,
    values: f,
    onErrors: setErr,
    onSubmit: (e) => {
      e.preventDefault();
      void applicationAction.run(() => submit(e));
    },
    className: "glass-panel space-y-6 rounded-lg p-6",
    children: [
      _jsxs("div", {
        children: [
          _jsx("h2", {
            className: "text-2xl font-bold",
            children: changeMode
              ? "Request an owner detail correction"
              : "Verify your owner account",
          }),
          _jsxs("p", {
            className: "text-sm text-muted-foreground",
            children: [
              "All details are checked by our admin team. Names must match your registered name:",
              " ",
              _jsx("b", { children: fullName }),
              ".",
            ],
          }),
        ],
      }),
      _jsxs("fieldset", {
        className: "grid gap-4 sm:grid-cols-3",
        children: [
          _jsx("legend", { className: "mb-2 font-semibold", children: "1. Government ID" }),
          _jsx(FormField, {
            field: "id_type",
            label: "ID type",
            children: _jsxs("select", {
              className: inputCls,
              value: f.id_type,
              onChange: set("id_type"),
              children: [
                _jsx("option", { value: "aadhaar", children: "Aadhaar" }),
                _jsx("option", { value: "pan", children: "PAN" }),
                _jsx("option", { value: "dl", children: "Driving licence" }),
              ],
            }),
          }),
          _jsx(FormField, {
            field: "id_number",
            label: "ID number",
            error: err["id_number"],
            children: _jsx("input", {
              className: `${inputCls} uppercase`,
              value: f.id_number,
              onChange: set("id_number"),
              maxLength: f.id_type === "aadhaar" ? 12 : f.id_type === "pan" ? 10 : 15,
            }),
          }),
          _jsx(FormField, {
            label: "ID copy (image/PDF)",
            error: err["id_file"],
            children: _jsx(UploadPicker, {
              label: "Owner ID document",
              pdf: true,
              files: files.id ? [files.id] : [],
              onChange: (v) => setFiles({ ...files, id: v[0] }),
              existing: retainedId,
              onRemoveExisting: () => setRetainedId([]),
            }),
          }),
        ],
      }),
      _jsxs("fieldset", {
        className: "grid gap-4 sm:grid-cols-2",
        children: [
          _jsx("legend", {
            className: "mb-2 font-semibold",
            children: "2. Proof of property & place",
          }),
          _jsx(FormField, {
            field: "property_doc_type",
            label: "Document type",
            children: _jsxs("select", {
              className: inputCls,
              value: f.property_doc_type,
              onChange: set("property_doc_type"),
              children: [
                _jsx("option", { value: "sale_deed", children: "Sale deed" }),
                _jsx("option", { value: "rental_agreement", children: "Rental agreement" }),
                _jsx("option", { value: "electricity_bill", children: "Electricity bill" }),
              ],
            }),
          }),
          _jsx(FormField, {
            label: "Document copy (image/PDF)",
            error: err["prop_file"],
            children: _jsx(UploadPicker, {
              label: "Property proof",
              pdf: true,
              files: files.prop ? [files.prop] : [],
              onChange: (v) => setFiles({ ...files, prop: v[0] }),
              existing: retainedProp,
              onRemoveExisting: () => setRetainedProp([]),
            }),
          }),
          _jsx("div", {
            className: "sm:col-span-2",
            children: _jsx(FormField, {
              field: "place_address",
              label: "Parking address (must match the document)",
              error: err["place_address"],
              children: _jsx("textarea", {
                className: inputCls,
                rows: 2,
                maxLength: 300,
                value: f.place_address,
                onChange: set("place_address"),
              }),
            }),
          }),
          _jsx("div", {
            className: "sm:col-span-2",
            children: _jsx(FormField, {
              label: "Photos of the space (2\u20136, min 640\u00D7480, JPG/PNG/WEBP)",
              error: err["photos"],
              hint: files.photos.length ? `${files.photos.length} selected` : undefined,
              children: _jsx(UploadPicker, {
                label: "Parking verification photos",
                max: 6,
                dimensions: true,
                files: files.photos,
                onChange: (v) => setFiles({ ...files, photos: v }),
                existing: retainedPhotos,
                onRemoveExisting: (path) =>
                  setRetainedPhotos(retainedPhotos.filter((p) => p !== path)),
              }),
            }),
          }),
        ],
      }),
      _jsxs("fieldset", {
        className: "grid gap-4 sm:grid-cols-2",
        children: [
          _jsx("legend", {
            className: "mb-2 font-semibold",
            children: "3. Bank details for payouts",
          }),
          _jsx(FormField, {
            field: "account_holder",
            label: "Account holder name",
            error: err["account_holder"],
            children: _jsx("input", {
              className: inputCls,
              maxLength: 100,
              value: f.account_holder,
              onChange: set("account_holder"),
            }),
          }),
          _jsx(FormField, {
            field: "ifsc",
            label: "IFSC",
            error: err["ifsc"],
            children: _jsx("input", {
              className: `${inputCls} uppercase`,
              value: f.ifsc,
              onChange: set("ifsc"),
              maxLength: 11,
            }),
          }),
          _jsx(FormField, {
            field: "account_number",
            label: "Account number",
            error: err["account_number"],
            children: _jsx("input", {
              className: inputCls,
              inputMode: "numeric",
              value: f.account_number,
              onChange: set("account_number"),
              maxLength: 18,
            }),
          }),
          _jsx(FormField, {
            field: "confirm_account",
            label: "Re-enter account number",
            error: err["confirm_account"],
            children: _jsx("input", {
              className: inputCls,
              inputMode: "numeric",
              value: f.confirm_account,
              onChange: set("confirm_account"),
              maxLength: 18,
              onPaste: (e) => e.preventDefault(),
            }),
          }),
        ],
      }),
      changeMode &&
        _jsx(FormField, {
          label: "Reason for correction",
          error: err["message"],
          children: _jsx("textarea", {
            required: true,
            minLength: 10,
            maxLength: 1000,
            rows: 3,
            value: message,
            onChange: (e) => setMessage(e.target.value),
            className: inputCls,
          }),
        }),
      _jsx(Button, {
        type: "submit",
        size: "lg",
        disabled: busy || applicationAction.pending,
        children: busy
          ? "Uploading documents…"
          : changeMode
            ? "Send change request"
            : "Submit for verification",
      }),
    ],
  });
}
function OwnerWorkspace({ uid }) {
  const [section, setSection] = useState("listings");
  const action = useActionLock();
  const controls = useDashboardFilter();
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const listings = useQuery({
    queryKey: ["owner-listings", uid],
    queryFn: async () => (await api.from("listings").eq("owner_id", uid)).data,
    refetchInterval: 30000,
  });
  const bookings = useQuery({
    queryKey: ["owner-bookings", uid],
    queryFn: async () => (await api.from("bookings")).data,
    refetchInterval: 30000,
  });
  const all = listings.data ?? [];
  const stays = bookings.data ?? [];
  const shownListings = controls.filter(
    all,
    (l) =>
      `${l.title} ${l.address} ${l.area} ${l.id} ${l.archived ? "archived" : l.verified ? "published" : "review"}`,
  );
  const shownBookings = controls.filter(
    stays,
    (b) =>
      `${b.code} ${b.listings?.title} ${b.arrival?.full_name} ${b.arrival?.phone} ${b.plate} ${b.status} ${b.booking_date}`,
  );
  return _jsxs(_Fragment, {
    children: [
      _jsx(MetricCards, {
        items: [
          {
            label: "Parking locations",
            value: all.length,
            note: `${all.filter((l) => l.verified && !l.archived).length} published`,
          },
          {
            label: "Total bays",
            value: all.filter((l) => !l.archived).reduce((n, l) => n + l.total, 0),
            note: "Adjust capacity on each location",
          },
          {
            label: "Upcoming / active stays",
            value: stays.filter((b) => b.status === "Confirmed").length,
            note: "Confirmed immediately when available",
          },
          {
            label: "Reservation value",
            value: `₹${stays
              .filter((b) => ["Confirmed", "Completed"].includes(b.status))
              .reduce((n, b) => n + b.amount, 0)
              .toLocaleString("en-IN")}`,
            note: "Reservation value, not collected payments",
          },
        ],
      }),
      _jsx(DashboardToolbar, {
        controls: controls,
        label: "Search locations, drivers, vehicles or bookings",
      }),
      (listings.error || bookings.error) &&
        _jsxs("p", {
          role: "alert",
          children: [
            "Some records could not be loaded.",
            " ",
            _jsx(Button, {
              onClick: () => {
                listings.refetch();
                bookings.refetch();
              },
              children: "Retry",
            }),
          ],
        }),
      _jsxs(Tabs, {
        value: section,
        onValueChange: setSection,
        children: [
          _jsx(DashboardSections, {
            value: section,
            onChange: setSection,
            options: [
              { value: "listings", label: `My locations (${all.length})` },
              { value: "reservations", label: `Arrivals & history (${stays.length})` },
            ],
          }),
          _jsxs(TabsContent, {
            value: "listings",
            className: "mt-5 space-y-5",
            children: [
              _jsxs("div", {
                className: "flex flex-wrap items-center justify-between gap-3",
                children: [
                  _jsxs("div", {
                    children: [
                      _jsx("h2", {
                        className: "text-2xl font-bold",
                        children: "Your parking locations",
                      }),
                      _jsx("p", {
                        className: "mt-1 text-sm text-muted-foreground",
                        children:
                          "Each card represents one address. Bay capacity and dates are managed separately for each location.",
                      }),
                    ],
                  }),
                  _jsxs(Button, {
                    onClick: () => {
                      setAdding(!adding);
                      setEditId(null);
                    },
                    children: [
                      _jsx(Plus, {}),
                      adding ? "Close new listing" : "Add parking location",
                    ],
                  }),
                ],
              }),
              (adding || editId) &&
                _jsx(
                  ListingForm,
                  {
                    existing: all.find((l) => l.id === editId),
                    uid: uid,
                    onDone: () => {
                      setAdding(false);
                      setEditId(null);
                      listings.refetch();
                    },
                  },
                  editId ?? "new",
                ),
              _jsx("div", {
                className: "grid gap-5 xl:grid-cols-2",
                children: shownListings.map((s) =>
                  _jsx(
                    ListingCard,
                    {
                      s: s,
                      onRefresh: () => listings.refetch(),
                      onEdit: () => {
                        setEditId(s.id);
                        setAdding(false);
                      },
                    },
                    s.id,
                  ),
                ),
              }),
              !shownListings.length &&
                _jsx(EmptyState, {
                  children:
                    "No matching parking locations. Add your first location to get started.",
                }),
            ],
          }),
          _jsxs(TabsContent, {
            value: "reservations",
            className: "mt-5 space-y-5",
            children: [
              _jsx("h2", {
                className: "text-2xl font-bold",
                children: "Arrivals & booking history",
              }),
              _jsx("p", {
                className: "text-sm text-muted-foreground",
                children:
                  "Verify the arriving vehicle number and ask to see the driving licence and vehicle RC.",
              }),
              all
                .filter((l) => shownBookings.some((b) => b.listing_id === l.id))
                .map((l) =>
                  _jsxs(
                    "section",
                    {
                      className: "space-y-3",
                      children: [
                        _jsxs("div", {
                          className: "border-l-4 border-primary pl-4",
                          children: [
                            _jsx("h3", { className: "font-bold", children: l.title }),
                            _jsx("p", {
                              className: "text-sm text-muted-foreground",
                              children: l.address,
                            }),
                          ],
                        }),
                        shownBookings
                          .filter((b) => b.listing_id === l.id)
                          .map((b) =>
                            _jsx(
                              BookingSummary,
                              {
                                booking: b,
                                showDriver: true,
                                actions:
                                  b.status === "Confirmed" &&
                                  b.ends_at &&
                                  +new Date(b.ends_at) <= Date.now()
                                    ? _jsx(Button, {
                                        disabled: action.pending,
                                        variant: "outline",
                                        onClick: () =>
                                          action.run(async () => {
                                            const { error } = await api
                                              .from("bookings")
                                              .update({ status: "Completed" })
                                              .eq("id", b.id);
                                            if (error) throw error;
                                            await bookings.refetch();
                                          }),
                                        children: "Mark completed",
                                      })
                                    : undefined,
                              },
                              b.id,
                            ),
                          ),
                      ],
                    },
                    l.id,
                  ),
                ),
              !shownBookings.length && _jsx(EmptyState, { children: "No matching bookings yet." }),
            ],
          }),
        ],
      }),
    ],
  });
}
function ListingCard({ s, onRefresh, onEdit }) {
  const action = useActionLock();
  const [count, setCount] = useState(String(s.total));
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const blocks = useQuery({
    queryKey: ["blocks", s.id],
    queryFn: async () => (await api.from("listing_blocks").eq("listing_id", s.id)).data,
  });
  return _jsxs("article", {
    className: "rounded-2xl border bg-card p-5",
    children: [
      _jsxs("div", {
        className: "flex flex-wrap justify-between gap-3",
        children: [
          _jsxs("div", {
            children: [
              _jsxs("p", {
                className: "text-xs font-mono text-muted-foreground",
                children: ["Location ", s.id.slice(-6).toUpperCase()],
              }),
              _jsx("h3", { className: "mt-1 text-xl font-bold", children: s.title }),
            ],
          }),
          _jsx(StatusPill, {
            status: s.archived ? "Archived" : s.verified ? "Published" : "pending",
          }),
        ],
      }),
      _jsx("p", { className: "mt-3 text-sm leading-6 text-muted-foreground", children: s.address }),
      _jsx("div", {
        className: "my-4 flex flex-wrap gap-2 text-xs",
        children: [
          `${s.total} bays`,
          `₹${s.hourly}/hour`,
          `₹${s.daily}/day`,
          `₹${s.monthly}/month`,
          s.open_window,
        ].map((t) =>
          _jsx("span", { className: "rounded-full bg-muted px-3 py-1.5", children: t }, t),
        ),
      }),
      _jsx(Timestamp, { label: "Listed", value: s.created_at }),
      _jsx(Timestamp, { label: "Updated", value: s.updated_at }),
      _jsxs("div", {
        className: "mt-4 flex flex-wrap gap-2",
        children: [
          _jsx(Button, {
            size: "sm",
            variant: "outline",
            onClick: onEdit,
            children: "Edit listing & photos",
          }),
          _jsx(Button, {
            size: "sm",
            variant: "outline",
            disabled: action.pending,
            onClick: () =>
              action.run(async () => {
                const { error } = await api
                  .from("listings")
                  .update({ archived: !s.archived })
                  .eq("id", s.id);
                if (error) throw error;
                onRefresh();
              }),
            children: s.archived ? "Restore for review" : "Archive location",
          }),
        ],
      }),
      _jsxs("details", {
        className: "mt-4 border-t pt-4",
        children: [
          _jsx("summary", {
            className: "text-sm font-semibold",
            children: "Adjust number of bays",
          }),
          _jsx("p", {
            className: "my-3 text-xs leading-5 text-muted-foreground",
            children:
              "Increase or reduce this location\u2019s capacity immediately. Capacity cannot go below the number of bays already reserved at any future time.",
          }),
          _jsxs("form", {
            className: "flex items-end gap-3",
            onSubmit: (e) => {
              e.preventDefault();
              void action.run(async () => {
                const n = Number(count);
                if (!Number.isInteger(n) || n < 1 || n > 500) throw new Error("Enter 1–500 bays");
                const { error } = await api.from("listings").update({ total: n }).eq("id", s.id);
                if (error) throw error;
                toast.success("Bay capacity updated");
                onRefresh();
              });
            },
            children: [
              _jsx(FormField, {
                label: "Total bays",
                children: _jsx("input", {
                  required: true,
                  type: "text",
                  inputMode: "numeric",
                  pattern: "[0-9]{1,3}",
                  maxLength: 3,
                  value: count,
                  onChange: (e) => setCount(e.target.value.replace(/\D/g, "")),
                  className: inputCls,
                }),
              }),
              _jsx(Button, { disabled: action.pending, type: "submit", children: "Update bays" }),
            ],
          }),
        ],
      }),
      _jsxs("details", {
        className: "mt-4 border-t pt-4",
        children: [
          _jsx("summary", {
            className: "text-sm font-semibold",
            children: "Block dates & view unavailable times",
          }),
          _jsxs("form", {
            className: "mt-4 grid gap-3 sm:grid-cols-2",
            onSubmit: (e) => {
              e.preventDefault();
              void action.run(async () => {
                if (!!start !== !!end || (start && end <= start))
                  throw new Error("Choose both times, with the end after the start");
                const { error } = await api.from("listing_blocks").insert({
                  listing_id: s.id,
                  block_date: date,
                  starts_at: start || null,
                  ends_at: end || null,
                });
                if (error) throw error;
                toast.success("Unavailable dates saved");
                await blocks.refetch();
              });
            },
            children: [
              _jsx(FormField, {
                label: "Block date",
                children: _jsx("input", {
                  required: true,
                  type: "date",
                  min: indiaDate(),
                  value: date,
                  onChange: (e) => setDate(e.target.value),
                  className: inputCls,
                }),
              }),
              _jsx("p", {
                className: "self-center text-xs text-muted-foreground",
                children: "Leave both times empty to block the whole day.",
              }),
              _jsx(FormField, {
                label: "From (optional)",
                children: _jsx("input", {
                  type: "time",
                  value: start,
                  onChange: (e) => setStart(e.target.value),
                  className: inputCls,
                }),
              }),
              _jsx(FormField, {
                label: "Until (optional)",
                children: _jsx("input", {
                  type: "time",
                  value: end,
                  onChange: (e) => setEnd(e.target.value),
                  className: inputCls,
                }),
              }),
              _jsx(Button, {
                type: "submit",
                variant: "secondary",
                disabled: action.pending,
                children: "Block date",
              }),
            ],
          }),
          _jsx("div", {
            className: "mt-4 space-y-2",
            children: blocks.data?.map((b) =>
              _jsxs(
                "div",
                {
                  className:
                    "flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-xs",
                  children: [
                    _jsxs("div", {
                      children: [
                        b.block_date,
                        " \u00B7 ",
                        b.starts_at ? `${b.starts_at}–${b.ends_at}` : "All day",
                        _jsx(Timestamp, { value: b.created_at, label: "Blocked" }),
                      ],
                    }),
                    _jsx(Button, {
                      size: "sm",
                      variant: "ghost",
                      disabled: action.pending,
                      onClick: () =>
                        action.run(async () => {
                          const { error } = await api
                            .from("listing_blocks")
                            .delete()
                            .eq("id", b.id);
                          if (error) throw error;
                          await blocks.refetch();
                        }),
                      children: "Unblock",
                    }),
                  ],
                },
                b.id,
              ),
            ),
          }),
        ],
      }),
    ],
  });
}
function ListingForm({ uid, onDone, existing }) {
  const [f, setF] = useState({
    title: existing?.title ?? "",
    city: existing?.city ?? "Bengaluru",
    area: existing?.area ?? "",
    address: existing?.address ?? "",
    landmark: existing?.landmark ?? "",
    size: existing?.size ?? "",
    open_window: existing?.open_window ?? "24 × 7",
    hourly: String(existing?.hourly ?? ""),
    daily: String(existing?.daily ?? ""),
    monthly: String(existing?.monthly ?? ""),
    total: String(existing?.total ?? 1),
    vehicles: existing?.vehicles ?? ["4W"],
    amenities: existing?.amenities.join(", ") ?? "",
    lat: String(existing?.lat ?? ""),
    lng: String(existing?.lng ?? ""),
    opens_at: existing?.opens_at.slice(0, 5) ?? "00:00",
    closes_at: existing?.closes_at.slice(0, 5) ?? "00:00",
    rental_rules: existing?.rental_rules ?? "",
  });
  const action = useActionLock();
  const [photo, setPhoto] = useState(null);
  const [retainedCover, setRetainedCover] = useState(
    existing?.photo_url ? [existing.photo_url] : [],
  );
  const [photos, setPhotos] = useState([]);
  const [retained, setRetained] = useState(existing?.photo_paths ?? []);
  const [err, setErr] = useState({});
  const set = (k) => (e) => {
    let value = e.target.value;
    if (["hourly", "daily", "monthly", "total"].includes(k)) value = value.replace(/\D/g, "");
    setF({ ...f, [k]: value });
    setErr((old) => ({ ...old, [k]: "" }));
  };
  const submit = async (e) => {
    e.preventDefault();
    await action.run(async () => {
      const r = listingSchema.safeParse(f);
      const er = r.success ? {} : fieldErrors(r.error);
      const pe =
        !photo && retainedCover.length
          ? null
          : (checkFile(photo, { label: "Cover photo" }) ??
            (photo ? await checkImageDimensions(photo) : null));
      if (pe) er["photo"] = pe;
      if (!galleryFits(retained.length, photos.length))
        er["gallery"] = "Choose at most 5 additional photos (6 including the cover)";
      for (const file of photos) {
        const issue =
          checkFile(file, { label: "Parking photo" }) ?? (await checkImageDimensions(file));
        if (issue) er["gallery"] = issue;
      }
      setErr(er);
      if (Object.keys(er).length || !r.success) return;
      const photo_url = photo
        ? await uploadDoc("listing-photos", uid, "cover", photo)
        : (retainedCover[0] ?? null);
      const amenities = f.amenities
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 10);
      const photo_paths = [
        ...retained,
        ...(await Promise.all(
          photos.map((file) => uploadDoc("listing-photos", uid, "gallery", file)),
        )),
      ];
      const row = {
        ...r.data,
        owner_id: uid,
        amenities,
        photo_url,
        photo_paths,
        open_window:
          r.data.opens_at === r.data.closes_at
            ? "24 × 7"
            : `${r.data.opens_at} – ${r.data.closes_at}`,
      };
      const { error } = existing
        ? await api.from("listings").update(row).eq("id", existing.id)
        : await api.from("listings").insert(row);
      if (error) throw error;
      toast.success("Listing submitted — it goes live after admin verification");
      onDone();
    });
  };
  const F = (k, label, extra) =>
    _jsx(FormField, {
      field: k,
      label: label,
      error: err[k],
      children: _jsx("input", {
        maxLength:
          {
            title: 100,
            city: 80,
            area: 60,
            address: 300,
            landmark: 80,
            size: 30,
            hourly: 4,
            daily: 5,
            monthly: 6,
            total: 3,
            amenities: 800,
            rental_rules: 1000,
          }[k] ?? 50,
        className: inputCls,
        value: f[k],
        onChange: set(k),
        ...extra,
      }),
    });
  return _jsxs(ValidatedForm, {
    schema: listingSchema,
    values: f,
    onErrors: setErr,
    onSubmit: submit,
    className: "glass-panel mb-6 grid gap-4 rounded-lg p-6 sm:grid-cols-2",
    children: [
      F("title", "Title"),
      F("city", "City"),
      F("area", "Area"),
      _jsx("div", { className: "sm:col-span-2", children: F("address", "Full address") }),
      F("landmark", "Nearest landmark"),
      F("size", "Bay size, e.g. 2.5 × 5 m"),
      F("hourly", "₹ per hour", { inputMode: "numeric" }),
      F("daily", "₹ per day", { inputMode: "numeric" }),
      F("monthly", "₹ per month", { inputMode: "numeric" }),
      F("total", "Number of bays", { inputMode: "numeric" }),
      F("opens_at", "Opens at (same time = 24 hours)", { type: "time" }),
      F("closes_at", "Closes at", { type: "time" }),
      F("lat", "Latitude", { type: "number", step: "any" }),
      F("lng", "Longitude", { type: "number", step: "any" }),
      F("rental_rules", "Rental rules", { maxLength: 1000 }),
      F("amenities", "Amenities (comma separated)"),
      _jsx(FormField, {
        label: "Vehicle types",
        error: err["vehicles"],
        children: _jsx("div", {
          className: "flex gap-4 pt-2 text-sm",
          children: ["2W", "4W"].map((v) =>
            _jsxs(
              "label",
              {
                className: "flex items-center gap-2",
                children: [
                  _jsx("input", {
                    type: "checkbox",
                    checked: f.vehicles.includes(v),
                    onChange: (e) =>
                      setF({
                        ...f,
                        vehicles: e.target.checked
                          ? [...f.vehicles, v]
                          : f.vehicles.filter((x) => x !== v),
                      }),
                  }),
                  v === "2W" ? "2-wheeler" : "4-wheeler",
                ],
              },
              v,
            ),
          ),
        }),
      }),
      _jsx("div", {
        className: "sm:col-span-2",
        children: _jsx(FormField, {
          label: "Cover photo",
          error: err["photo"],
          children: _jsx(UploadPicker, {
            label: "Listing cover photo",
            dimensions: true,
            bucket: "listing-photos",
            files: photo ? [photo] : [],
            onChange: (v) => setPhoto(v[0] ?? null),
            existing: retainedCover,
            onRemoveExisting: () => setRetainedCover([]),
          }),
        }),
      }),
      _jsx("div", {
        className: "sm:col-span-2",
        children: _jsx(FormField, {
          label: "Additional parking photos (up to 5)",
          error: err["gallery"],
          children: _jsx(UploadPicker, {
            label: "Additional parking photos",
            dimensions: true,
            max: 5,
            bucket: "listing-photos",
            files: photos,
            onChange: setPhotos,
            existing: retained,
            onRemoveExisting: (path) => setRetained(retained.filter((p) => p !== path)),
          }),
        }),
      }),
      _jsx(Button, {
        disabled: action.pending,
        type: "submit",
        className: "sm:col-span-2",
        children: existing ? "Save listing" : "Submit listing",
      }),
    ],
  });
}
