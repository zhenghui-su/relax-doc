import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <span className="inline-flex rounded-full bg-black/[0.045] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Create account
        </span>
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground">
          创建账号
        </h1>
        <p className="text-sm leading-7 text-muted">
          几秒内进入你的文档空间。
        </p>
      </div>

      <RegisterForm redirectTo={params.redirectTo} />
    </div>
  );
}
