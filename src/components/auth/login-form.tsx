'use client';

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { emptyFormState } from "@/lib/auth/validation";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action] = useActionState(loginAction, emptyFormState);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/docs"} />

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          className="input-field focus-ring h-12 rounded-2xl bg-white"
        />
        {state.errors?.email?.[0] ? (
          <p className="text-sm text-danger">{state.errors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="输入密码"
          className="input-field focus-ring h-12 rounded-2xl bg-white"
        />
        {state.errors?.password?.[0] ? (
          <p className="text-sm text-danger">{state.errors.password[0]}</p>
        ) : null}
      </div>

      {state.message ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <SubmitButton className="h-12 w-full rounded-2xl" pendingLabel="登录中...">
        登录
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        还没有账号？{" "}
        <Link href="/register" className="font-semibold text-foreground hover:text-black">
          立即注册
        </Link>
      </p>
    </form>
  );
}
