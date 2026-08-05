# CRM Permission Matrix

Date: 2026-08-05  
Canonical runtime roles: `admin` | `agency_partner` | `customer`  
Finer job titles (Owner, Manager, Counter, Accountant) are **UI/capability aliases** mapped onto `admin` until a dedicated role migration is approved.

Legend: **Y** = allowed · **N** = denied · **S** = scoped (own / assigned / created)

| Capability | Admin | Agency Partner | Customer |
|------------|:-----:|:--------------:|:--------:|
| `customers.view` | Y | S | self |
| `customers.create` | Y | S | N (self-signup only) |
| `customers.edit` | Y | S | self (limited) |
| `customers.merge` | Y | N | N |
| `applications.view` | Y | S | self |
| `applications.create` | Y | S | self (website) |
| `applications.status_change` | Y | S (workflow) | N |
| `applications.assign` | Y | N | N |
| `payments.view` | Y | S | self |
| `payments.edit` | Y | S (collect) | N |
| `documents.view` | Y | S | self (visible) |
| `documents.upload` | Y | S | self (permitted) |
| `exports.run` | Y | N | N |
| `staff.manage` | Y | team (CEO types) | N |
| `roles.manage` | Y | N | N |
| `services.manage` | Y | N | N |
| `integrations.manage` | Y | N | N |
| `analytics.view` | Y | S | N |
| `audit.view` | Y | N | N |
| `leads.view` | Y | S | N |
| `leads.convert` | Y | S | N |
| `messaging.resend` | Y | N | N |
| `walk_in.create` | Y | Y | N |

Enforcement: `src/lib/crm/permissions.ts` + existing route gates + RLS. Hiding UI is not sufficient.
