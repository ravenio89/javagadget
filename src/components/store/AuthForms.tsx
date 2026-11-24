import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { auth } from "@/lib/auth";
import { loginCustomer, registerCustomer } from "@/lib/auth.functions";
import { siteConfig } from "@/config/site.config";

const authField =
  "h-11 w-full rounded-lg border border-input bg-card px-4 text-sm outline-none focus:border-foreground";

export function AuthForms({ onSuccess }: { onSuccess?: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const login = useServerFn(loginCustomer);
  const register = useServerFn(registerCustomer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r =
        tab === "login"
          ? await login({ data: { email: String(f.get("email")), password: String(f.get("password")) } })
          : await register({
              data: {
                firstName: String(f.get("firstName")),
                lastName: String(f.get("lastName") ?? ""),
                email: String(f.get("email")),
                password: String(f.get("password")),
              },
            });
      if (!r.ok) {
        setError(r.message);
      } else {
        auth.signIn({ name: r.name, email: r.email, token: r.token });
        toast.success(
          tab === "login" ? `Selamat datang kembali, ${r.name}!` : `Akun berhasil dibuat. Halo, ${r.name}!`,
        );
        onSuccess?.();
      }
    } catch {
      setError("Data tidak valid. Periksa kembali isian Anda.");
    }
    setBusy(false);
  }

  return (
    <div className="flex-1">
      <div className="grid grid-cols-2 rounded-full bg-secondary p-1 text-sm font-semibold">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setError("");
            }}
            className={`h-9 rounded-full transition-colors ${tab === t ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {t === "login" ? "Masuk" : "Daftar"}
          </button>
        ))}
      </div>
      <form key={tab} onSubmit={submit} className="mt-4 space-y-3">
        {tab === "register" && (
          <div className="grid grid-cols-2 gap-3">
            <input name="firstName" required placeholder="Nama depan" className={authField} autoComplete="given-name" />
            <input name="lastName" placeholder="Nama belakang" className={authField} autoComplete="family-name" />
          </div>
        )}
        <input name="email" type="email" required placeholder="Email" className={authField} autoComplete="email" />
        <input
          name="password"
          type="password"
          required
          minLength={tab === "register" ? 6 : 1}
          placeholder={tab === "register" ? "Kata sandi (min. 6 karakter)" : "Kata sandi"}
          className={authField}
          autoComplete={tab === "login" ? "current-password" : "new-password"}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          disabled={busy}
          className="h-12 w-full rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Memproses…" : tab === "login" ? "Masuk" : "Buat Akun"}
        </button>
      </form>
      <p className="mt-4 text-xs text-muted-foreground">
        Gunakan email &amp; kata sandi akun {siteConfig.name} Anda. Lupa kata sandi? Atur ulang di{" "}
        <a
          href={`${siteConfig.storeUrl}/my-account/lost-password/`}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          halaman akun toko
        </a>
        .
      </p>
    </div>
  );
}
