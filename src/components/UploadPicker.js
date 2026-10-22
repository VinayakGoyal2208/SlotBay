import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useState } from "react";
import { FileText, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/integrations/api/client";
import { checkFile, checkImageDimensions, MAX_UPLOAD_MB } from "@/lib/validation";
import { Button } from "./ui/button";
export function FilePreview({ file, path, bucket = "documents", label, onRemove }) {
  const source = file || path;
  const [preview, setPreview] = useState({
    source: undefined,
    url: "",
  });
  const url = preview.source === source ? preview.url : "";
  const [failedUrl, setFailedUrl] = useState("");
  const failed = !!url && failedUrl === url;
  useEffect(() => {
    let active = true;
    let blob = "";
    let frame = 0;
    if (file) {
      frame = requestAnimationFrame(() => {
        blob = URL.createObjectURL(file);
        if (active) setPreview({ source: file, url: blob });
      });
    } else if (path) {
      api.storage
        .from(bucket)
        .createSignedUrl(path, 600)
        .then((r) => {
          if (active && r.data) setPreview({ source: path, url: r.data.signedUrl });
        });
    }
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      if (blob) URL.revokeObjectURL(blob);
    };
  }, [file, path, bucket]);
  const pdf = file?.type === "application/pdf" || path?.toLowerCase().endsWith(".pdf");
  return _jsxs("div", {
    className: "relative w-28 min-w-0 rounded-xl border bg-background p-2",
    children: [
      _jsx("a", {
        href: url || undefined,
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": `Open ${label}`,
        className: "grid h-20 place-items-center overflow-hidden rounded-lg bg-muted",
        children:
          url && !pdf && !failed
            ? _jsx("img", {
                src: url,
                alt: label,
                onError: () => setFailedUrl(url),
                className: "h-full w-full object-cover",
              })
            : _jsx(FileText, { className: "size-7 text-muted-foreground" }),
      }),
      _jsx("p", {
        className: "mt-2 truncate text-xs",
        title: file?.name || label,
        children: file?.name || label,
      }),
      onRemove &&
        _jsx(Button, {
          type: "button",
          size: "icon",
          variant: "secondary",
          className: "absolute -right-2 -top-2 size-7 rounded-full border shadow",
          onClick: onRemove,
          "aria-label": `Remove ${file?.name || label}`,
          children: _jsx(X, { className: "size-3" }),
        }),
    ],
  });
}
export function UploadPicker({
  label,
  files,
  onChange,
  existing = [],
  onRemoveExisting,
  bucket = "documents",
  max = 1,
  pdf = false,
  disabled = false,
  dimensions = false,
}) {
  const id = useId();
  const [checking, setChecking] = useState(false);
  return _jsxs("div", {
    className: "space-y-3 rounded-xl border border-dashed bg-muted/20 p-4",
    children: [
      _jsxs("div", {
        className: "flex flex-wrap items-center justify-between gap-3",
        children: [
          _jsxs("label", {
            htmlFor: id,
            className: `relative inline-flex cursor-pointer items-center focus-within:ring-2 focus-within:ring-primary gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary ${disabled || checking ? "pointer-events-none opacity-50" : ""}`,
            children: [
              _jsx(Plus, { className: "size-4" }),
              checking ? "Checking files…" : max === 1 ? "Choose file" : "Add photos",
              _jsx("input", {
                id: id,
                "aria-label": label,
                className: "sr-only",
                type: "file",
                multiple: max > 1,
                accept: `image/jpeg,image/png,image/webp${pdf ? ",application/pdf" : ""}`,
                disabled: disabled || checking,
                onChange: async (e) => {
                  const picked = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  setChecking(true);
                  try {
                    if (existing.length + files.length + picked.length > max) {
                      toast.error(
                        `Keep at most ${max} file${max === 1 ? "" : "s"}. Remove a file before replacing it.`,
                      );
                      return;
                    }
                    const next = [...files];
                    for (const f of picked) {
                      const issue =
                        checkFile(f, { pdf, label: f.name }) ??
                        (dimensions ? await checkImageDimensions(f) : null);
                      if (issue) {
                        toast.error(issue);
                        continue;
                      }
                      if (
                        next.some(
                          (x) =>
                            x.name === f.name &&
                            x.size === f.size &&
                            x.lastModified === f.lastModified,
                        )
                      ) {
                        toast.error(`${f.name} is already selected`);
                        continue;
                      }
                      next.push(f);
                    }
                    onChange(next);
                  } finally {
                    setChecking(false);
                  }
                },
              }),
            ],
          }),
          _jsxs("span", {
            className: "text-xs text-muted-foreground",
            children: [files.length + existing.length, " / ", max, " selected"],
          }),
        ],
      }),
      _jsxs("p", {
        className: "text-xs text-muted-foreground",
        children: [
          pdf ? "Images or PDF" : "JPG, PNG or WEBP",
          " \u00B7 10 KB\u2013",
          MAX_UPLOAD_MB,
          " MB",
          dimensions ? " · at least 640 × 480" : "",
          ". Remove a thumbnail to replace only that file.",
        ],
      }),
      _jsxs("div", {
        className: "flex flex-wrap gap-4",
        children: [
          existing.map((path, i) =>
            _jsx(
              FilePreview,
              {
                path: path,
                bucket: bucket,
                label: `Saved file ${i + 1}`,
                ...(onRemoveExisting && !disabled
                  ? { onRemove: () => onRemoveExisting(path) }
                  : {}),
              },
              path,
            ),
          ),
          files.map((file, i) =>
            _jsx(
              FilePreview,
              {
                file: file,
                label: `Selected file ${i + 1}`,
                ...(!disabled ? { onRemove: () => onChange(files.filter((_, n) => n !== i)) } : {}),
              },
              `${file.name}-${file.lastModified}-${i}`,
            ),
          ),
        ],
      }),
    ],
  });
}
