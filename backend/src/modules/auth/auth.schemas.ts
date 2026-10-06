import { z } from 'zod';
import { requiredText } from '../../shared/schemas';

const email = z
  .string({ required_error: 'e-mail é obrigatório' })
  .trim()
  .toLowerCase()
  .email('e-mail inválido');

const code = z.string({ required_error: 'código é obrigatório' }).regex(/^\d{6}$/, 'o código deve ter 6 dígitos');

// Formato E.164 exigido pela Twilio: +<código do país><número>, ex.: +5511999998888
const phone = z
  .string({ required_error: 'telefone é obrigatório' })
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .refine((value) => /^\+[1-9]\d{9,14}$/.test(value), {
    message: 'telefone deve estar no formato internacional, ex.: +5511999998888',
  });

const password = z
  .string({ required_error: 'senha é obrigatória' })
  .min(8, 'a senha deve ter ao menos 8 caracteres')
  .max(72, 'a senha deve ter no máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'a senha deve conter ao menos uma letra')
  .regex(/\d/, 'a senha deve conter ao menos um número');

export const registerSchema = z.object({
  name: requiredText('nome', 120),
  email,
  phone,
  password,
});

export const verifyPhoneSchema = z.object({ email, code });

export const resendCodeSchema = z.object({ email });

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'senha é obrigatória' }).min(1, 'senha é obrigatória'),
});

export const loginVerifySchema = z.object({
  challengeToken: z.string({ required_error: 'challengeToken é obrigatório' }).min(1),
  code,
});

export const refreshSchema = z.object({ refreshToken: z.string().min(1).optional() }).default({});

export const twoFactorSettingsSchema = z.object({
  enabled: z.boolean({ required_error: 'enabled é obrigatório', invalid_type_error: 'enabled deve ser booleano' }),
  password: z.string({ required_error: 'senha é obrigatória' }).min(1, 'senha é obrigatória'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginVerifyInput = z.infer<typeof loginVerifySchema>;
export type TwoFactorSettingsInput = z.infer<typeof twoFactorSettingsSchema>;
