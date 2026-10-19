This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Prerequisites: Node 24 (`.nvmrc`) and Docker. The local database is the Supabase CLI stack (Postgres, Storage, Studio) running in Docker.

```bash
npm install
npm run db:start     # local Supabase: DB on 127.0.0.1:34322, Studio on http://127.0.0.1:34323
cp .env.example .env # then fill the local values (see the "Local development" block)
npm run db:migrate   # apply prisma/migrations
npm run db:seed      # load the spec sample data (idempotent)
npm run dev
```

Ports are 3432x instead of Supabase's default 5432x, because Windows/WSL (Hyper-V) often reserves the 54xxx range. `npm run db:status` prints the local keys; `npm run db:reset` wipes and reseeds; `npm run db:stop` stops the stack. API tests (`npm run test:api`) use a separate `shiftpatch_test` database in the same container (`TEST_DATABASE_URL`), created and migrated automatically.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
