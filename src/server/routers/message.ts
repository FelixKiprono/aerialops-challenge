/**
 *
 * This is an example router, you can delete this file and then update `../pages/api/trpc/[trpc].tsx`
 */
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { deleteChat, getAllMessages, sendMessage } from '~/mongo/message';
import dbConnect from 'lib/dbConnect';
import { Hash } from 'crypto';
import { parseUrl } from 'next/dist/shared/lib/router/utils/parse-url';
import AWS from 'aws-sdk';

// Connect to mongodb
(async () => await dbConnect())();

export const msgRouter = router({
  list: publicProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ input }) => getAllMessages({ input })),
  add: publicProcedure
    .input(
      z
        .object({
          message: z.string(),
          hasImage: z.boolean(),
          sentAt: z.date(),
          fileType: z.string(),
        })
        .partial(),
    )
    .mutation( ({ input }) =>  sendMessage({ input })),
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => deleteChat({ input })),
});
