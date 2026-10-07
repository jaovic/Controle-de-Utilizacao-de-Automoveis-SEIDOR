import { z } from 'zod';
import { requiredText } from '../../shared/schemas';

const email = z
  .string({ required_error: 'e-mail é obrigatório' })
  .trim()
  .toLowerCase()
  .email('e-mail inválido');

// Senha forte: as mesmas regras exibidas no medidor de força do cadastro (frontend).
const password = z
  .string({ required_error: 'senha é obrigatória' })
  .min(8, 'a senha deve ter ao menos 8 caracteres')
  .max(72, 'a senha deve ter no máximo 72 caracteres')
  .regex(/[a-z]/, 'a senha deve conter ao menos uma letra minúscula')
  .regex(/[A-Z]/, 'a senha deve conter ao menos uma letra maiúscula')
  .regex(/\d/, 'a senha deve conter ao menos um número')
  .regex(/[^A-Za-z0-9]/, 'a senha deve conter ao menos um caractere especial (ex.: ! @ # $ %)');

export const registerSchema = z.object({
  name: requiredText('nome', 120),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'senha é obrigatória' }).min(1, 'senha é obrigatória'),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(1).optional() }).default({});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
