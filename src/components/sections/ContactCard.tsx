import { Phone, MessageCircle, MapPin, Clock, Mail } from "lucide-react";
import { site } from "@/data/site";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

export function ContactCard({ className }: { className?: string }) {
  return (
    <Reveal
      className={cn(
        "rounded-[24px] border border-border bg-white p-6 shadow-card md:p-8",
        className,
      )}
    >
      <h3 className="text-lg font-extrabold">مشاوره و ثبت‌نام</h3>
      <p className="mt-1 text-[13px] text-paragraph">
        برای انتخاب بهترین دوره، دریافت اطلاعات و ثبت‌نام، از راه‌های زیر با
        کارشناسان آموزشی در ارتباط باشید.
      </p>

      <div className="mt-6 grid gap-3">
        <a
          href={`tel:${site.phone}`}
          className="group flex items-center justify-between rounded-2xl border border-border bg-white p-4 transition hover:border-primary/40 hover:shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary/[0.06] text-primary">
              <Phone className="size-5" strokeWidth={1.9} />
            </div>
            <div>
              <div className="text-[13px] font-bold">تماس تلفنی</div>
              <div dir="ltr" className="text-[12px] text-paragraph">
                {site.phoneDisplay}
              </div>
            </div>
          </div>
          <span className="text-[12px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
            تماس
          </span>
        </a>

        <a
          href={`https://wa.me/${site.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center justify-between rounded-2xl bg-[#25D366] p-4 text-white shadow-card transition hover:brightness-95"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-white/20">
              <MessageCircle className="size-5" strokeWidth={1.9} />
            </div>
            <div>
              <div className="text-[13px] font-bold">پیام در واتساپ</div>
              <div dir="ltr" className="text-[12px] opacity-90">
                {site.mobileDisplay}
              </div>
            </div>
          </div>
          <span className="text-[12px] font-semibold">شروع گفتگو</span>
        </a>

        <a
          href={`mailto:${site.email}`}
          className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 transition hover:border-primary/40"
        >
          <div className="grid size-11 place-items-center rounded-xl bg-primary/[0.06] text-primary">
            <Mail className="size-5" strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold">ایمیل</div>
            <div dir="ltr" className="truncate text-[12px] text-paragraph">
              {site.email}
            </div>
          </div>
        </a>

        <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/[0.06] text-primary">
            <MapPin className="size-5" strokeWidth={1.9} />
          </div>
          <div>
            <div className="text-[13px] font-bold">آدرس</div>
            <div className="text-[12px] leading-6 text-paragraph">
              {site.address}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/[0.06] text-primary">
            <Clock className="size-5" strokeWidth={1.9} />
          </div>
          <div>
            <div className="text-[13px] font-bold">ساعت کاری</div>
            <div className="text-[12px] text-paragraph">{site.hours}</div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
