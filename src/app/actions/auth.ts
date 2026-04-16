'use server';

import { hash } from 'bcryptjs';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { prisma } from '@/lib/db';
import {
	emptyFormState,
	loginSchema,
	registerSchema,
	type FormState,
} from '@/lib/auth/validation';

export async function loginAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const validated = loginSchema.safeParse({
		email: formData.get('email'),
		password: formData.get('password'),
	});

	const redirectTo = formData.get('redirectTo')?.toString().trim() || '/docs';

	if (!validated.success) {
		return {
			ok: false,
			message: '请先修正表单中的问题',
			errors: validated.error.flatten().fieldErrors,
		};
	}

	try {
		await signIn('credentials', {
			email: validated.data.email,
			password: validated.data.password,
			redirectTo,
		});
	} catch (error) {
		if (error instanceof AuthError) {
			return {
				ok: false,
				message: '邮箱或密码错误',
			};
		}

		throw error;
	}

	return emptyFormState;
}

export async function registerAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const validated = registerSchema.safeParse({
		name: formData.get('name'),
		email: formData.get('email'),
		password: formData.get('password'),
	});

	const redirectTo = formData.get('redirectTo')?.toString().trim() || '/docs';

	if (!validated.success) {
		return {
			ok: false,
			message: '请先修正表单中的问题',
			errors: validated.error.flatten().fieldErrors,
		};
	}

	const existingUser = await prisma.user.findUnique({
		where: { email: validated.data.email },
	});

	if (existingUser) {
		return {
			ok: false,
			message: '该邮箱已被注册',
		};
	}

	const passwordHash = await hash(validated.data.password, 12);

	await prisma.user.create({
		data: {
			name: validated.data.name || null,
			email: validated.data.email,
			passwordHash,
		},
	});

	try {
		await signIn('credentials', {
			email: validated.data.email,
			password: validated.data.password,
			redirectTo,
		});
	} catch (error) {
		if (error instanceof AuthError) {
			return {
				ok: false,
				message: '账号已创建，但自动登录失败',
			};
		}

		throw error;
	}

	return emptyFormState;
}

export async function logoutAction() {
	await signOut({ redirectTo: '/login' });
}
