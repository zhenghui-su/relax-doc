import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <span className="inline-flex rounded-full bg-black/[0.045] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Sign in
        </span>
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground">
          欢迎回来
        </h1>
        <p className="text-sm leading-7 text-muted">
          登录后继续编辑你的文档。
        </p>
      </div>

      <LoginForm redirectTo={params.redirectTo} />
    </div>
  );
}
