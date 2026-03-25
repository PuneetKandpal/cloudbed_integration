#!/bin/bash

echo "Regenerating Prisma client for server..."
npx prisma generate --schema=server/prisma/schema.prisma

echo "Regenerating Prisma client for worker..."
npx prisma generate --schema=worker/prisma/schema.prisma

echo "Pushing schema changes to database..."
npx prisma db push --schema=server/prisma/schema.prisma

echo "Done!"
