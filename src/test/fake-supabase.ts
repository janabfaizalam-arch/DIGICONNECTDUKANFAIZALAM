/**
 * An in-memory stand-in for the Supabase service-role client, for running real
 * route handlers in tests.
 *
 * It really applies the filters a route builds — eq, neq, in, is, or(a.eq.x,…)
 * — to the rows it holds, so a route that forgets an ownership filter returns
 * another customer's row here exactly as it would against Postgres. It does
 * NOT apply RLS: the routes use the service role, which bypasses RLS, so their
 * own filters are the only protection and that is what these tests exercise.
 */

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

export type FakeStorageObject = { bucket: string; path: string; body: Uint8Array; contentType?: string };

export class FakeSupabase {
  tables: Record<string, Row[]>;
  storageObjects: FakeStorageObject[] = [];
  signedUrls: { bucket: string; path: string; expiresIn: number }[] = [];
  private idCounter = 0;

  constructor(tables: Record<string, Row[]> = {}) {
    this.tables = structuredClone(tables);
  }

  from(table: string) {
    this.tables[table] ??= [];
    return new Query(this, table);
  }

  nextId() {
    this.idCounter += 1;
    return `00000000-0000-4000-8000-${String(this.idCounter).padStart(12, "0")}`;
  }

  rpc() {
    return Promise.resolve({ data: null, error: { code: "PGRST202", message: "rpc not available in fake" } });
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, body: Blob | Uint8Array, opts?: { contentType?: string; upsert?: boolean }) => {
        if (!opts?.upsert && this.storageObjects.some((o) => o.bucket === bucket && o.path === path)) {
          return { data: null, error: { message: "The resource already exists" } };
        }
        const bytes = body instanceof Uint8Array ? body : new Uint8Array(await (body as Blob).arrayBuffer());
        this.storageObjects.push({ bucket, path, body: bytes, contentType: opts?.contentType });
        return { data: { path }, error: null };
      },
      download: async (path: string) => {
        const object = this.storageObjects.find((o) => o.bucket === bucket && o.path === path);
        if (!object) return { data: null, error: { message: "Object not found" } };
        return { data: new Blob([object.body as BlobPart]), error: null };
      },
      createSignedUrl: async (path: string, expiresIn: number) => {
        this.signedUrls.push({ bucket, path, expiresIn });
        return { data: { signedUrl: `https://storage.test/${bucket}/${path}?token=t&exp=${expiresIn}` }, error: null };
      },
      remove: async (paths: string[]) => {
        this.storageObjects = this.storageObjects.filter((o) => !(o.bucket === bucket && paths.includes(o.path)));
        return { data: paths, error: null };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/public/${bucket}/${path}` } }),
    }),
  };
}

class Query implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
  private filters: Filter[] = [];
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row[] = [];
  private returning = false;
  private cardinality: "one" | "maybe" | null = null;
  private limitN: number | null = null;
  private countOnly = false;

  constructor(private db: FakeSupabase, private table: string) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    if (this.op === "select") this.op = "select";
    else this.returning = true;
    if (options?.head) this.countOnly = true;
    return this;
  }
  gte(column: string, value: string | number) {
    this.filters.push((row) => String(row[column] ?? "") >= String(value));
    return this;
  }
  lte(column: string, value: string | number) {
    this.filters.push((row) => String(row[column] ?? "") <= String(value));
    return this;
  }
  not(column: string, operator: string, value: unknown) {
    if (operator !== "eq") throw new Error("fake not() supports eq only");
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = (Array.isArray(rows) ? rows : [rows]).map((r) => ({ id: this.db.nextId(), ...r }));
    return this;
  }
  upsert(rows: Row | Row[]) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.payload = [values];
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }
  ilike(column: string, pattern: string) {
    const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`, "i");
    this.filters.push((row) => re.test(String(row[column] ?? "")));
    return this;
  }
  /** PostgREST `or` with `col.eq.value` terms only. */
  or(expression: string) {
    const terms = expression.split(",").map((term) => {
      const [column, operator, ...rest] = term.split(".");
      if (operator !== "eq") throw new Error(`fake or() supports eq only, got ${term}`);
      return { column, value: rest.join(".") };
    });
    this.filters.push((row) => terms.some((t) => String(row[t.column]) === t.value));
    return this;
  }
  order() {
    return this;
  }
  range() {
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    this.cardinality = "maybe";
    return this;
  }
  single() {
    this.cardinality = "one";
    return this;
  }

  then<T1 = { data: unknown; error: unknown }, T2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private matching() {
    const rows = this.db.tables[this.table];
    return rows.filter((row) => this.filters.every((f) => f(row)));
  }

  private execute(): { data: unknown; error: unknown; count?: number } {
    if (this.countOnly) return { data: null, error: null, count: this.matching().length };
    let result: Row[];
    if (this.op === "insert") {
      this.db.tables[this.table].push(...this.payload);
      result = this.payload;
    } else if (this.op === "upsert") {
      for (const row of this.payload) {
        const existing = this.db.tables[this.table].find((r) => r.id !== undefined && r.id === row.id);
        if (existing) Object.assign(existing, row);
        else this.db.tables[this.table].push({ id: this.db.nextId(), ...row });
      }
      result = this.payload;
    } else if (this.op === "update") {
      result = this.matching();
      for (const row of result) Object.assign(row, this.payload[0]);
    } else if (this.op === "delete") {
      result = this.matching();
      this.db.tables[this.table] = this.db.tables[this.table].filter((r) => !result.includes(r));
    } else {
      result = this.matching();
    }
    if (this.limitN !== null) result = result.slice(0, this.limitN);

    if (this.cardinality === "one") {
      if (result.length !== 1) return { data: null, error: { code: "PGRST116", message: "not exactly one row" } };
      return { data: structuredClone(result[0]), error: null };
    }
    if (this.cardinality === "maybe") {
      return { data: result[0] ? structuredClone(result[0]) : null, error: null };
    }
    return { data: structuredClone(result), error: null };
  }
}
