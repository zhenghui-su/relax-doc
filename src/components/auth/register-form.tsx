'use client';

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { emptyFormState } from "@/lib/auth/validation";

export function RegisterForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action] = useActionState(registerAction, emptyFormState);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/docs"} />

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          昵称
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="你的显示名称"
          className="input-field focus-ring h-12 rounded-2xl bg-white"
        />
        {state.errors?.name?.[0] ? (
          <p className="text-sm text-danger">{state.errors.name[0]}</p>
        ) : null}
      </div>

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
          autoComplete="new-password"
          placeholder="至少 8 位字符"
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

      <SubmitButton className="h-12 w-full rounded-2xl" pendingLabel="注册中...">
        注册账号
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        已有账号？{" "}
        <Link href="/login" className="font-semibold text-foreground hover:text-black">
          去登录
        </Link>
      </p>
    </form>
  );
}
