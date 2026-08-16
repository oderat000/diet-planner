This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

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

### Accounts and the GitHub Pages preview

Login and signup require a Next.js server because they use Server Actions, secure cookies,
and Upstash Redis. They cannot run inside the static GitHub Pages export.

Deploy the complete app to a Next.js server host such as Vercel and configure its
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `AUTH_PEPPER`, and `AUTH_URL`
environment variables (see `.env.example`). Then set the GitHub Actions repository
variable `NEXT_PUBLIC_APP_URL` to that deployment's origin, for example
`https://your-project.vercel.app`. The Pages preview's `/login/` and `/signup/` routes will
then hand visitors to the functioning server deployment. Until it is configured, those
routes clearly explain that accounts are unavailable instead of returning a 404.
