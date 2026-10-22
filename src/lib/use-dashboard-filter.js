import { useState } from "react";
export function useDashboardFilter() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  function filter(rows, text, date = (r) => String(r.created_at ?? r.submitted_at ?? "")) {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((r) => text(r).toLowerCase().includes(needle))
      .sort((a, b) =>
        sort === "name"
          ? text(a).localeCompare(text(b))
          : ((+new Date(date(a) || 0) || 0) - (+new Date(date(b) || 0) || 0)) *
            (sort === "oldest" ? 1 : -1),
      );
  }
  return { search, setSearch, sort, setSort, filter };
}
