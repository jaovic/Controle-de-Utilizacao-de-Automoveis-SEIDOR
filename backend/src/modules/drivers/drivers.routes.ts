import { Router } from 'express';
import { authorize } from '../../shared/middlewares/auth';
import { validate } from '../../shared/middlewares/validate';
import { idParamSchema } from '../../shared/schemas';
import type { DriversController } from './drivers.controller';
import { createDriverSchema, listDriversQuerySchema, updateDriverSchema } from './drivers.schemas';

export function driversRoutes(controller: DriversController) {
  const router = Router();
  const adminOnly = authorize('ADMIN');

  router.post('/', adminOnly, validate({ body: createDriverSchema }), controller.create);
  router.get('/', validate({ query: listDriversQuerySchema }), controller.list);
  router.get('/:id', validate({ params: idParamSchema }), controller.getById);
  router.put('/:id', adminOnly, validate({ params: idParamSchema, body: updateDriverSchema }), controller.update);
  router.delete('/:id', adminOnly, validate({ params: idParamSchema }), controller.delete);

  return router;
}
