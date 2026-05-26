import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: any; // You might want to use a more specific type like User from Prisma if available
    }
  }
}
