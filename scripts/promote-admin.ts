/**
 * Promote a user to `admin` role by phone number.
 *
 * Usage:
 *   bun run db:promote-admin --phone=09123456789
 *   bun run db:promote-admin --phone=09123456789 --role=support
 *
 * This is the only way to bootstrap the first admin — there is no UI
 * for it yet (intentional — promoting admins should require shell
 * access, not a web form).
 *
 * Exits with:
 *   0 — success, role updated
 *   1 — user not found, DB unavailable, or bad input
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { normalizeIranianPhone } from "../src/lib/phone";

const VALID_ROLES = ["student", "instructor", "support", "admin"] as const;
type TargetRole = (typeof VALID_ROLES)[number];

function parseArgs(argv: string[]): {
  phone: string | null;
  role: TargetRole;
} {
  let phone: string | null = null;
  let role: TargetRole = "admin";

  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--phone=")) {
      phone = arg.slice("--phone=".length).trim();
    } else if (arg.startsWith("--role=")) {
      const r = arg.slice("--role=".length).trim() as TargetRole;
      if (!VALID_ROLES.includes(r)) {
        console.error(
          `نقش نامعتبر: «${r}». نقش‌های مجاز: ${VALID_ROLES.join(", ")}`,
        );
        process.exit(1);
      }
      role = r;
    } else if (arg === "-h" || arg === "--help") {
      console.log(
        [
          "استفاده:",
          "  bun run db:promote-admin --phone=09123456789 [--role=admin]",
          "",
          "نقش‌های مجاز: student, instructor, support, admin (پیش‌فرض: admin)",
        ].join("\n"),
      );
      process.exit(0);
    }
  }

  return { phone, role };
}

async function main() {
  const { phone: rawPhone, role } = parseArgs(process.argv);

  if (!rawPhone) {
    console.error("خطا: پارامتر --phone الزامی است.");
    console.error("مثال: bun run db:promote-admin --phone=09123456789");
    process.exit(1);
  }

  const phone = normalizeIranianPhone(rawPhone);
  if (!phone) {
    console.error(
      `خطا: شماره موبایل نامعتبر است: «${rawPhone}». فرمت صحیح: 09XXXXXXXXX`,
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "خطا: DATABASE_URL در محیط تنظیم نشده است. این اسکریپت نیاز به اتصال واقعی به پایگاه‌داده دارد.",
    );
    process.exit(1);
  }

  // Use a short-lived client — this script exits after one operation,
  // so we don't need the singleton from `db/client.ts`.
  const queryClient = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    prepare: false,
  });
  const db = drizzle(queryClient, { schema });

  try {
    const [existing] = await db
      .select({
        id: schema.users.id,
        phone: schema.users.phone,
        role: schema.users.role,
        fullName: schema.users.fullName,
      })
      .from(schema.users)
      .where(eq(schema.users.phone, phone))
      .limit(1);

    if (!existing) {
      console.error(
        `خطا: کاربری با شماره «${phone}» یافت نشد. ابتدا باید این کاربر حداقل یک‌بار از طریق /dashboard وارد شده باشد تا رکوردش ساخته شود.`,
      );
      process.exit(1);
    }

    if (existing.role === role) {
      console.log(
        `کاربر با شماره «${phone}» از قبل نقش «${role}» دارد. تغییری اعمال نشد.`,
      );
      process.exit(0);
    }

    await db
      .update(schema.users)
      .set({ role })
      .where(eq(schema.users.id, existing.id));

    console.log("✓ نقش کاربر با موفقیت به‌روزرسانی شد:");
    console.log(`  شناسه:    ${existing.id}`);
    console.log(`  شماره:    ${existing.phone}`);
    console.log(`  نام:      ${existing.fullName ?? "—"}`);
    console.log(`  نقش قبلی: ${existing.role}`);
    console.log(`  نقش جدید: ${role}`);
    process.exit(0);
  } catch (err) {
    console.error("خطا هنگام اجرای عملیات روی پایگاه‌داده:");
    console.error(err);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

void main();
