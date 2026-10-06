import { z } from 'zod';

export const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'USER'], { errorMap: () => ({ message: 'role deve ser ADMIN ou USER' }) }),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
