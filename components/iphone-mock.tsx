import { BrandIcon } from "./brand-icon";
import { Logo } from "./logo";

// Realistic titanium iPhone (chassis per provided spec), screen showing the
// live hero content + the current WhatsApp thread. Pure CSS, no images.
export function IPhoneMock() {
  return (
    <div aria-hidden className="relative mx-auto h-[670px] w-[330px] select-none" style={{ filter: "drop-shadow(0 35px 45px rgba(0,0,0,.55))" }}>
      <div
        className="absolute inset-0 rounded-[48px] p-[7px]"
        style={{
          background: "linear-gradient(145deg,#d7d7d7 0%,#6e6e6e 18%,#202020 45%,#8f8f8f 72%,#dedede 100%)",
          boxShadow: "inset 1px 1px 2px rgba(255,255,255,.8), inset -2px -2px 4px rgba(0,0,0,.7), 0 0 0 1px #111",
        }}
      >
        <div
          className="relative h-full w-full overflow-hidden rounded-[42px] text-zinc-900"
          style={{
            background: "radial-gradient(circle at 50% 0%, rgba(13,148,136,.18), transparent 40%), linear-gradient(180deg,#fbf8f3,#ffffff)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)",
          }}
        >
          <div
            className="absolute left-1/2 top-[13px] z-10 h-[30px] w-[105px] -translate-x-1/2 rounded-[20px] bg-black"
            style={{ boxShadow: "inset 0 0 5px rgba(255,255,255,.08), 0 1px 2px rgba(255,255,255,.08)" }}
          />
          <div className="absolute left-[22px] right-[22px] top-[12px] z-[5] flex items-center justify-between text-[13px] font-semibold">
            <span>9:41</span>
            <span className="flex items-center gap-[7px] text-[9px]">●●● ▮ ▰</span>
          </div>
          <div className="flex h-full flex-col px-5 pb-8 pt-14">
            <div className="flex justify-center"><Logo size={22} /></div>
            <p className="mt-2 text-center text-[19px] font-extrabold leading-tight tracking-tight">
              Your all-in-one growth team that delivers real revenue
            </p>
            <div className="mt-3 flex justify-center gap-1.5">
              <span className="rounded-full bg-zinc-900 px-3.5 py-2 text-[11px] font-semibold text-white">Free GBP Booster →</span>
              <span className="rounded-full border border-black/15 px-3.5 py-2 text-[11px] font-semibold">Book Demo</span>
            </div>
            <div className="mt-3 flex justify-center gap-1.5">
              {["whatsapp", "facebook", "instagram", "messenger", "telegram"].map((c) => (
                <span key={c} className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white">
                  <BrandIcon name={c} size={16} />
                </span>
              ))}
            </div>
            <div className="mt-3 rounded-2xl bg-[#e7ffdb] p-2.5">
              <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-white px-2.5 py-1.5 text-[11px] shadow-sm">Price for the bridal package?</p>
              <p className="mt-1.5 w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-[#d9fdd3] px-2.5 py-1.5 text-[11px] shadow-sm">₹8,999 all-inclusive — slots open this weekend ✅</p>
            </div>
            <div className="mt-auto rounded-2xl border border-black/10 bg-white p-2.5">
              <p className="text-[12px] font-bold">Your Business #1</p>
              <p className="text-[11px] text-zinc-600">4.9 ★ (212) · <em className="text-emerald-600">Open now</em></p>
            </div>
          </div>
          <div className="absolute bottom-[9px] left-1/2 h-[5px] w-[105px] -translate-x-1/2 rounded-[10px] bg-zinc-900" />
        </div>
      </div>
      <div className="absolute -right-[4px] top-[145px] h-[95px] w-[5px] rounded-r bg-gradient-to-r from-[#444] via-[#aaa] to-[#333]" />
      <div className="absolute -left-[4px] top-[145px] h-[60px] w-[5px] rounded-l bg-gradient-to-l from-[#444] via-[#aaa] to-[#333]" />
      <div className="absolute -left-[4px] top-[218px] h-[60px] w-[5px] rounded-l bg-gradient-to-l from-[#444] via-[#aaa] to-[#333]" />
    </div>
  );
}
