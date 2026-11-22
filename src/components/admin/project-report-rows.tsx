"use client";

/**
 * The rows a DPR is actually made of, made editable.
 *
 * The form asks for five things and the chosen business type fills in the
 * rest — machinery, products, raw material, staff — sized to the project
 * cost. That is the right default and it stays: most DPRs are filed for an
 * ordinary unit and the template's unit is close enough.
 *
 * It is not enough on its own. A bank reads the machinery list against the
 * customer's own quotation, so "Atta chakki 20 HP" has to become whatever
 * the quotation says. And a unit that mills wheat *and* presses oil *and*
 * grinds besan sells five products, not the template's two — with the
 * template's rows the sales table, and therefore every statement built on
 * it, describes a different business.
 *
 * So the rows the engine already accepts, and the API schema already
 * validates, are editable here. They live inside "Aur details (optional)":
 * the five-field path is untouched for anyone who does not need them.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  AdminButton,
  AdminInput,
  AdminSelect,
} from "@/components/admin/primitives/controls-ui";
import {
  ASSET_KINDS,
  itemAmount,
  type CapitalItem,
  type Product,
  type RawMaterial,
  type StaffRow,
} from "@/lib/project-reports/engine";
import { cn } from "@/lib/utils";

/* ── Number input ────────────────────────────────────────────────────────── */

/**
 * A number field that does not fight the person typing.
 *
 * It keeps its own text while focused — reformatting mid-keystroke is how a
 * "1" being typed towards "12000" becomes "1" again — and follows the value
 * only when it changes from outside.
 */
export function NumberBox({
  value,
  onChange,
  label,
  nullable = false,
  placeholder,
  className,
  suffix,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  nullable?: boolean;
  placeholder?: string;
  className?: string;
  suffix?: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => {
    const parsed =
      text.replace(/,/g, "").trim() === ""
        ? null
        : Number(text.replace(/,/g, ""));
    if (parsed !== value && !(parsed === null && value === 0 && !nullable))
      setText(value === null ? "" : String(value));
    // Only follow outside changes, never re-format while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cn("relative", className)}>
      <AdminInput
        aria-label={label}
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const cleaned = next.replace(/,/g, "").trim();
          if (cleaned === "") onChange(nullable ? null : 0);
          else if (Number.isFinite(Number(cleaned))) onChange(Number(cleaned));
        }}
        className={cn("tabular-nums", suffix && "pr-10")}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ds-text-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

/* ── Shared shell ────────────────────────────────────────────────────────── */

const rupee = (value: number) =>
  `Rs. ${Math.round(value).toLocaleString("en-IN")}`;

/**
 * One editable list: a heading, the rows, a running total and an add button.
 *
 * `columns` are the grid widths, repeated per row, so every row lines up
 * under its heading on a wide screen. On a phone each row stacks and the
 * column headings are hidden — the per-field `aria-label` carries the name
 * instead, which is what a screen reader reads either way.
 */
function RowSection({
  title,
  help,
  columns,
  headings,
  rows,
  total,
  onAdd,
  addLabel,
}: {
  title: string;
  help: string;
  columns: string;
  headings: string[];
  rows: ReactNode;
  total?: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <section className="mt-6">
      <h3 className="text-xs font-bold uppercase tracking-wide text-ds-text-muted">
        {title}
      </h3>
      <p className="mt-1 text-xs text-ds-text-muted">{help}</p>

      <div
        className={cn(
          "mt-3 hidden gap-2 border-b border-ds-border pb-1.5 md:grid",
          "md:[grid-template-columns:var(--dpr-cols)]",
        )}
        style={{ "--dpr-cols": columns } as CSSProperties}
        aria-hidden="true"
      >
        {headings.map((heading) => (
          <span
            key={heading}
            className="text-[11px] font-bold uppercase tracking-wide text-ds-text-muted"
          >
            {heading}
          </span>
        ))}
      </div>

      <div className="mt-2 space-y-3 md:space-y-1.5">{rows}</div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <AdminButton size="sm" variant="secondary" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {addLabel}
        </AdminButton>
        {total ? (
          <span className="text-xs font-bold tabular-nums text-ds-text-secondary">
            {total}
          </span>
        ) : null}
      </div>
    </section>
  );
}

/**
 * One row's wrapper: the grid on a wide screen, a stacked card on a phone.
 *
 * The column template rides in a CSS variable rather than `gridTemplateColumns`
 * directly, because an inline style cannot be put behind a media query — set
 * that way the wide-screen columns would squeeze the fields on a phone too.
 * The variable is only read from `md` up, so below it the children stack.
 */
function Row({
  columns,
  onRemove,
  removeLabel,
  children,
}: {
  columns: string;
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-ds-md border border-ds-border p-2.5",
        "md:items-center md:rounded-none md:border-0 md:p-0",
        "md:[grid-template-columns:var(--dpr-cols)]",
      )}
      style={{ "--dpr-cols": columns } as CSSProperties}
    >
      {children}
      <AdminButton
        size="sm"
        variant="ghost"
        iconOnly
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="justify-self-start text-ds-danger md:justify-self-center"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </AdminButton>
    </div>
  );
}

/** Replace one row in a list, leaving the rest alone. */
function replaceAt<T>(rows: T[], index: number, patch: Partial<T>): T[] {
  return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

/* ── Machinery and other capital items ───────────────────────────────────── */

const CAPITAL_COLUMNS = "9rem minmax(0,1fr) 5rem 7rem 7rem 2.5rem";

export function CapitalItemRows({
  items,
  onChange,
}: {
  items: CapitalItem[];
  onChange: (items: CapitalItem[]) => void;
}) {
  const total = items.reduce((sum, item) => sum + itemAmount(item), 0);

  return (
    <RowSection
      title="Machinery aur saaman"
      help="Bank is list ko customer ke quotation se milata hai, to naam aur rate wahi rakhiye jo quotation mein hain. Project cost in sab ka jod hai."
      columns={CAPITAL_COLUMNS}
      headings={["Kism", "Saaman ka naam", "Nag", "Rate (Rs.)", "Amount", ""]}
      total={`Total: ${rupee(total)}`}
      addLabel="Saaman jodiye"
      onAdd={() =>
        onChange([
          ...items,
          { kind: "machinery", description: "", quantity: 1, rate: 0 },
        ])
      }
      rows={items.map((item, index) => (
        <Row
          key={index}
          columns={CAPITAL_COLUMNS}
          removeLabel={`${item.description || "Saaman"} hataiye`}
          onRemove={() => onChange(items.filter((_, i) => i !== index))}
        >
          <AdminSelect
            aria-label="Saaman ki kism"
            selectSize="sm"
            value={item.kind}
            onChange={(event) =>
              onChange(
                replaceAt(items, index, {
                  kind: event.target.value as CapitalItem["kind"],
                }),
              )
            }
          >
            {ASSET_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </AdminSelect>
          <AdminInput
            aria-label="Saaman ka naam"
            inputSize="sm"
            value={item.description}
            placeholder="Jaise: Atta chakki 20 HP with motor"
            onChange={(event) =>
              onChange(
                replaceAt(items, index, { description: event.target.value }),
              )
            }
          />
          <NumberBox
            label="Nag (quantity)"
            value={item.quantity}
            onChange={(value) =>
              onChange(replaceAt(items, index, { quantity: value ?? 0 }))
            }
          />
          <NumberBox
            label="Rate rupees mein"
            value={item.rate}
            onChange={(value) =>
              onChange(replaceAt(items, index, { rate: value ?? 0 }))
            }
          />
          <span className="self-center text-xs font-semibold tabular-nums text-ds-text-secondary">
            {rupee(itemAmount(item))}
          </span>
        </Row>
      ))}
    />
  );
}

/* ── Products ────────────────────────────────────────────────────────────── */

const PRODUCT_COLUMNS = "minmax(0,1fr) 6rem 8rem 8rem 2.5rem";

export function ProductRows({
  products,
  onChange,
}: {
  products: Product[];
  onChange: (products: Product[]) => void;
}) {
  const total = products.reduce((sum, p) => sum + p.capacity * p.price, 0);

  return (
    <RowSection
      title="Products aur sales"
      help="Poori capacity (100%) par saal bhar ka utpadan aur rate. Har saal ka sale isi par utilisation % lagakar nikalta hai."
      columns={PRODUCT_COLUMNS}
      headings={["Product ka naam", "Unit", "Saal bhar (100%)", "Rate per unit", ""]}
      total={`100% capacity par sale: ${rupee(total)}`}
      addLabel="Product jodiye"
      onAdd={() =>
        onChange([
          ...products,
          { name: "", unit: "kg", capacity: 0, price: 0 },
        ])
      }
      rows={products.map((product, index) => (
        <Row
          key={index}
          columns={PRODUCT_COLUMNS}
          removeLabel={`${product.name || "Product"} hataiye`}
          onRemove={() => onChange(products.filter((_, i) => i !== index))}
        >
          <AdminInput
            aria-label="Product ka naam"
            inputSize="sm"
            value={product.name}
            placeholder="Jaise: Sarso ka tel (kachi ghani)"
            onChange={(event) =>
              onChange(replaceAt(products, index, { name: event.target.value }))
            }
          />
          <AdminInput
            aria-label="Product ka unit"
            inputSize="sm"
            value={product.unit}
            placeholder="kg"
            onChange={(event) =>
              onChange(replaceAt(products, index, { unit: event.target.value }))
            }
          />
          <NumberBox
            label="Saal bhar ka utpadan poori capacity par"
            value={product.capacity}
            onChange={(value) =>
              onChange(replaceAt(products, index, { capacity: value ?? 0 }))
            }
          />
          <NumberBox
            label="Rate per unit rupees mein"
            value={product.price}
            onChange={(value) =>
              onChange(replaceAt(products, index, { price: value ?? 0 }))
            }
          />
        </Row>
      ))}
    />
  );
}

/* ── Raw material ────────────────────────────────────────────────────────── */

const MATERIAL_COLUMNS = "minmax(0,1fr) 6rem 8rem 8rem 2.5rem";

export function RawMaterialRows({
  materials,
  onChange,
}: {
  materials: RawMaterial[];
  onChange: (materials: RawMaterial[]) => void;
}) {
  const total = materials.reduce((sum, m) => sum + m.quantity * m.rate, 0);

  return (
    <RowSection
      title="Kachcha maal"
      help="Poori capacity par saal bhar ki kharid. Consumption har saal utilisation % ke hisaab se lagta hai."
      columns={MATERIAL_COLUMNS}
      headings={["Maal ka naam", "Unit", "Saal bhar (100%)", "Rate per unit", ""]}
      total={`100% capacity par kharid: ${rupee(total)}`}
      addLabel="Kachcha maal jodiye"
      onAdd={() =>
        onChange([
          ...materials,
          { name: "", unit: "kg", quantity: 0, rate: 0 },
        ])
      }
      rows={materials.map((material, index) => (
        <Row
          key={index}
          columns={MATERIAL_COLUMNS}
          removeLabel={`${material.name || "Kachcha maal"} hataiye`}
          onRemove={() => onChange(materials.filter((_, i) => i !== index))}
        >
          <AdminInput
            aria-label="Kachche maal ka naam"
            inputSize="sm"
            value={material.name}
            placeholder="Jaise: Sarso"
            onChange={(event) =>
              onChange(
                replaceAt(materials, index, { name: event.target.value }),
              )
            }
          />
          <AdminInput
            aria-label="Kachche maal ka unit"
            inputSize="sm"
            value={material.unit}
            placeholder="kg"
            onChange={(event) =>
              onChange(
                replaceAt(materials, index, { unit: event.target.value }),
              )
            }
          />
          <NumberBox
            label="Saal bhar ki kharid poori capacity par"
            value={material.quantity}
            onChange={(value) =>
              onChange(replaceAt(materials, index, { quantity: value ?? 0 }))
            }
          />
          <NumberBox
            label="Rate per unit rupees mein"
            value={material.rate}
            onChange={(value) =>
              onChange(replaceAt(materials, index, { rate: value ?? 0 }))
            }
          />
        </Row>
      ))}
    />
  );
}

/* ── Staff ───────────────────────────────────────────────────────────────── */

const STAFF_COLUMNS = "minmax(0,1fr) 5rem 8rem 9rem 2.5rem";

export function StaffRows({
  staff,
  onChange,
}: {
  staff: StaffRow[];
  onChange: (staff: StaffRow[]) => void;
}) {
  const monthly = staff.reduce((sum, s) => sum + s.count * s.monthlySalary, 0);

  return (
    <RowSection
      title="Staff"
      help="Mahine ki salary per person. 'Utpadan' wale staff ka kharcha cost of production mein jaata hai, 'Office' wala alag."
      columns={STAFF_COLUMNS}
      headings={["Post", "Kitne", "Salary / mahina", "Kaam", ""]}
      total={`Mahine ka total: ${rupee(monthly)}`}
      addLabel="Staff jodiye"
      onAdd={() =>
        onChange([
          ...staff,
          { role: "", count: 1, monthlySalary: 0, direct: true },
        ])
      }
      rows={staff.map((person, index) => (
        <Row
          key={index}
          columns={STAFF_COLUMNS}
          removeLabel={`${person.role || "Staff"} hataiye`}
          onRemove={() => onChange(staff.filter((_, i) => i !== index))}
        >
          <AdminInput
            aria-label="Post ka naam"
            inputSize="sm"
            value={person.role}
            placeholder="Jaise: Machine operator"
            onChange={(event) =>
              onChange(replaceAt(staff, index, { role: event.target.value }))
            }
          />
          <NumberBox
            label="Kitne log"
            value={person.count}
            onChange={(value) =>
              onChange(
                replaceAt(staff, index, { count: Math.round(value ?? 0) }),
              )
            }
          />
          <NumberBox
            label="Mahine ki salary per person"
            value={person.monthlySalary}
            onChange={(value) =>
              onChange(replaceAt(staff, index, { monthlySalary: value ?? 0 }))
            }
          />
          <AdminSelect
            aria-label="Kaam ka prakaar"
            selectSize="sm"
            value={person.direct ? "direct" : "office"}
            onChange={(event) =>
              onChange(
                replaceAt(staff, index, {
                  direct: event.target.value === "direct",
                }),
              )
            }
          >
            <option value="direct">Utpadan</option>
            <option value="office">Office / sales</option>
          </AdminSelect>
        </Row>
      ))}
    />
  );
}
