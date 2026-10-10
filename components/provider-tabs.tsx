"use client";

import { useEffect, useState } from "react";
import { useMap } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Badge, Button, Card, Group, PasswordInput, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import { Skeleton } from "@/components/admin-ui";

interface Field { label: string; hint: string; set: boolean }
type Status = Record<string, { fields: Field[]; source: string }>;

const TITLES: Record<string, { title: string; blurb: string }> = {
  razorpay: { title: "Razorpay", blurb: "India · UPI, cards, netbanking" },
  payu: { title: "PayU", blurb: "India · hosted checkout" },
  easebuzz: { title: "Easebuzz", blurb: "India · hosted checkout" },
  stripe: { title: "Stripe", blurb: "International · cards, wallets" },
  paytm: { title: "Paytm", blurb: "India · wallet, UPI, cards" },
  wise: { title: "Wise", blurb: "Payout rail · refunds & partner payouts abroad" },
  autumn: { title: "Autumn", blurb: "Third-party biller · event mirror only, ledger stays truth" },
};

export function ProviderTabs({ only }: { only?: string[] }) {
  const [st, setSt] = useState<Status>({});
  const vals = useMap<string, string>();
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [chats, setChats] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const d = await fetch("/api/providers").then((r) => r.json()).catch(() => null);
    if (d?.providers) {
      const all = d.providers as Status;
      setSt(only ? Object.fromEntries(Object.entries(all).filter(([k]) => only.includes(k))) : all);
    }
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function save(name: string) {
    const body: Record<string, string> = {};
    for (const f of st[name]?.fields ?? []) {
      const v = vals.get(`${name}:${f.label}`);
      if (v !== undefined) body[f.label] = v;
    }
    const res = await fetch("/api/providers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, values: body }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg((m) => ({ ...m, [name]: res.ok ? "Saved ✓ (AES-sealed)" : (d.error ?? "Save failed") }));
    for (const f of st[name]?.fields ?? []) vals.delete(`${name}:${f.label}`);
    void load();
  }

  async function clear(name: string) {
    modals.openConfirmModal({
      title: "Clear dashboard credentials?",
      children: "Environment values (if any) still apply after clearing.",
      labels: { confirm: "Clear", cancel: "Keep" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        fetch(`/api/providers?name=${name}`, { method: "DELETE" }).catch(() => {});
        setTimeout(() => void load(), 400);
      },
    });
  }

  async function detectChats() {
    setMsg((m) => ({ ...m, telegram: "Asking Telegram… (message @saurabharch_bot first)" }));
    const res = await fetch("/api/providers/telegram/chats").catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (Array.isArray(data?.chats)) {
      setChats(data.chats);
      setMsg((m) => ({ ...m, telegram: data.chats.length ? `Found ${data.chats.length} chat(s) — tap one to use it.` : "No chats seen yet — send /start to the bot first." }));
    } else {
      setMsg((m) => ({ ...m, telegram: data?.error || "Detect failed" }));
    }
  }

  async function assignChat(id: string) {
    const res = await fetch("/api/providers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "telegram", values: { TELEGRAM_TEAM_CHAT_ID: id } }),
    });
    setMsg((m) => ({ ...m, telegram: res.ok ? `Team chat set to ${id} ✓` : "Save failed" }));
    void load();
  }

  async function test(name: string) {
    setMsg((m) => ({ ...m, [name]: "Testing…" }));
    const res = await fetch("/api/providers/test", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && data.ok !== false;
    const detail = `${data.detail ?? data.error ?? ""}`.slice(0, 160);
    setMsg((m) => ({ ...m, [name]: `${ok ? "✓" : "✗"} ${detail}` }));
    notifications.show({ title: name, message: detail || (ok ? "OK" : "failed"), color: ok ? "teal" : "red" });
  }

  if (Object.keys(st).length === 0 && !loaded)
    return <SimpleGrid cols={{ base: 1, md: 2 }}><Skeleton lines={4} /><Skeleton lines={4} /></SimpleGrid>;

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      {Object.entries(st).map(([name, p]) => {
        const meta = TITLES[name];
        const modeField = p.fields.find((f) => f.label.endsWith("_MODE"));
        const rest = p.fields.filter((f) => f !== modeField);
        return (
          <Card key={name} withBorder radius="lg" p="md">
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <div>
                  <Text fw={700} tt="capitalize">{meta?.title ?? name}</Text>
                  {meta && <Text size="xs" c="dimmed">{meta.blurb}</Text>}
                </div>
                <Badge color={p.source === "dashboard" ? "teal" : p.source === "env" ? "blue" : "gray"} variant="light">
                  {p.source}
                </Badge>
              </Group>
              {modeField && (
                <div>
                  <Text size="xs" fw={600} mb={4}>Environment</Text>
                  <SegmentedControl
                    fullWidth
                    value={vals.get(`${name}:${modeField.label}`) ?? "test"}
                    onChange={(v) => vals.set(`${name}:${modeField.label}`, v)}
                    data={[
                      { label: "Test", value: "test" },
                      { label: "Live", value: "live" },
                    ]}
                  />
                  <Text size="xs" c="dimmed" mt={4}>
                    {modeField.set
                      ? "A mode is saved (value hidden) — picking one overwrites it on Save."
                      : "No mode saved — test applies. Flip to Live only with live keys saved below."}
                  </Text>
                </div>
              )}
              {rest.map((f) => (
                <PasswordInput
                  key={f.label}
                  label={f.label}
                  placeholder={f.set ? "•••••• (set — leave blank to keep)" : f.hint}
                  value={vals.get(`${name}:${f.label}`) ?? ""}
                  onChange={(e) => vals.set(`${name}:${f.label}`, e.currentTarget.value)}
                  autoComplete="off"
                />
              ))}
              <Group gap="xs" mt="xs">
                <Button onClick={() => void save(name)} color="teal" size="sm">Save</Button>
                <Button onClick={() => void test(name)} variant="light" size="sm">Test</Button>
                <Button onClick={() => void clear(name)} variant="subtle" color="gray" size="sm">Clear</Button>
                {name === "telegram" && (
                  <Button onClick={() => void detectChats()} variant="light" size="sm">Detect chats</Button>
                )}
              </Group>
              {name === "telegram" && chats.length > 0 && (
                <Group gap="xs">
                  {chats.map((c) => (
                    <Button key={c.id} onClick={() => void assignChat(c.id)} variant="outline" size="xs" radius="xl">
                      Use {c.name} ({c.id})
                    </Button>
                  ))}
                </Group>
              )}
              {msg[name] && <Text size="xs" c="dimmed">{msg[name]}</Text>}
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
