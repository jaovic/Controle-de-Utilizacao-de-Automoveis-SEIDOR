import { Router } from 'express';
import { authorize } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';
import { idParamSchema } from '../../shared/schemas';
import type { UsersController } from './users.controller';
import { updateRoleSchema } from './users.schemas';

export function usersRoutes(controller: UsersController) {
  const router = Router();

  router.use(authorize('ADMIN'));
  router.get('/', controller.list);
  router.patch('/:id/role', validate({ params: idParamSchema, body: updateRoleSchema }), controller.updateRole);
  router.delete('/:id', validate({ params: idParamSchema }), controller.delete);

  return router;
}
