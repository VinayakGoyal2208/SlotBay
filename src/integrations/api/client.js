const resource = (s) => s.replaceAll("_", "-");
export async function request(path, init = {}) {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "X-SlotBay-Request": "1",
      ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await response
    .json()
    .catch(() => ({ message: "The service returned an invalid response" }));
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body;
}
class Query {
  table;
  method = "GET";
  payload;
  params = new URLSearchParams();
  id;
  key = crypto.randomUUID();
  constructor(table) {
    this.table = table;
  }
  select(_columns = "*") {
    return this;
  }
  eq(field, value) {
    this.params.set(field, String(value));
    if (field === "id" || field === "user_id") this.id = String(value);
    return this;
  }
  in(field, values) {
    if (field !== "listing_id") throw new Error("Unsupported filter");
    this.params.set("listing_ids", values.join(","));
    return this;
  }
  order(field, options) {
    this.params.set("sort", field);
    this.params.set("direction", options?.ascending === false ? "desc" : "asc");
    return this;
  }
  limit(n) {
    this.params.set("limit", String(n));
    return this;
  }
  insert(payload) {
    this.method = "POST";
    this.payload = payload;
    return this;
  }
  upsert(payload) {
    return this.insert(payload);
  }
  update(payload) {
    this.method = "PATCH";
    this.payload = payload;
    return this;
  }
  delete() {
    this.method = "DELETE";
    return this;
  }
  async execute() {
    try {
      if (["PATCH", "DELETE"].includes(this.method) && !this.id)
        throw new Error("An explicit record ID is required");
      const route = `/${resource(this.table)}${["PATCH", "DELETE"].includes(this.method) ? "/" + encodeURIComponent(this.id) : ""}`;
      if (this.method === "GET") {
        const all = [];
        for (let page = 1; page <= 100; page++) {
          this.params.set("page", String(page));
          const rows = await request(`${route}?${this.params}`);
          all.push(...rows);
          if (
            this.params.has("limit") ||
            rows.length < 200 ||
            ["profiles", "user_roles"].includes(this.table)
          )
            break;
          if (page === 100)
            throw new Error("Too many records for this view. Use paginated reporting API.");
        }
        return { data: all, error: null };
      }
      const row = await request(route, {
        method: this.method,
        ...(this.payload ? { body: JSON.stringify(this.payload) } : {}),
        headers: { "Idempotency-Key": this.key },
      });
      return { data: [row], error: null };
    } catch (e) {
      if (this.method === "GET") throw e;
      return { data: [], error: { message: e.message } };
    }
  }
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
  async maybeSingle() {
    const r = await this.execute();
    return { ...r, data: r.data[0] ?? null };
  }
  async single() {
    const r = await this.execute();
    return { ...r, data: r.data[0] };
  }
}
const listeners = new Set();
let current = null;
async function authCall(path, body) {
  try {
    const data = await request(`/auth/${path}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (data.session || path === "logout") {
      current = data.session ?? null;
      listeners.forEach((fn) => fn(path, current));
    }
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}
export const api = {
  from: (table) => new Query(table),
  auth: {
    onAuthStateChange(fn) {
      listeners.add(fn);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(fn);
            },
          },
        },
      };
    },
    async getSession() {
      try {
        const data = await request("/auth/session");
        current = data.session;
        return { data, error: null };
      } catch (e) {
        return { data: { session: null }, error: { message: e.message } };
      }
    },
    async getUser() {
      const r = await this.getSession();
      return { data: { user: r.data.session?.user ?? null }, error: r.error };
    },
    signInWithPassword: (v) => authCall("login", v),
    signUp: (v) =>
      authCall("register", { email: v.email, password: v.password, ...v.options.data }),
    signOut: () => authCall("logout", {}),
  },
  storage: {
    from: (bucket) => ({
      async upload(path, file, _options) {
        try {
          const data = await request(`/files/upload?${new URLSearchParams({ bucket, path })}`, {
            method: "POST",
            body: file,
            headers: { "Content-Type": file.type },
          });
          return { data, error: null };
        } catch (e) {
          return { data: null, error: { message: e.message } };
        }
      },
      async createSignedUrl(path, _seconds) {
        try {
          const data = await request(`/files/signed?${new URLSearchParams({ bucket, path })}`);
          return { data, error: null };
        } catch (e) {
          return { data: null, error: { message: e.message } };
        }
      },
    }),
  },
};
export async function uploadDoc(bucket, uid, name, file) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${uid}/${name}-${crypto.randomUUID()}.${ext}`;
  const { error } = await api.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}
export async function submitChange(category, message, proposed) {
  return request("/change-requests", {
    method: "POST",
    body: JSON.stringify({ category, message, proposed }),
  });
}
