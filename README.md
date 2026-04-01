# OhamsLight Hub

OhamsLight Hub is a role-based LMS platform built with Next.js, TypeScript, Tailwind CSS, and Firebase.

## Features

- Role-based auth and dashboards: student, teacher, admin, superadmin
- Course marketplace with search, filters, bookmarks, coupons, and payments
- Teacher course creation, content builder (sections/lessons), analytics, and coupons
- Student learning flow with resume tracking and progress
- Quiz + certificate flow
- Announcements, discussion boards, direct chat, notifications, and email notifications

## Tech Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Firebase Auth + Firestore + Storage
- Firebase Admin SDK
- Recharts
- Resend (email via REST)
- Stripe Checkout (REST)

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Configure environment variables in `.env.local`

```bash
# Firebase client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Stripe
STRIPE_SECRET_KEY=

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=
```

3. Ensure Firebase Admin credentials are available (application default credentials or equivalent local setup).

4. Run development server

```bash
npm run dev
```

Open `http://localhost:3000` (or the next available port shown in terminal).

## Important Route Notes

- UI route for course creation is at `/teacher/create-course`.
- Teacher course API is at `/api/teacher/courses`.
- Marketplace coupons are validated at `/api/courses/[courseId]/coupon/validate`.
- Payment flow uses:
	- `/api/payments/create-checkout-session`
	- `/api/payments/verify`

## Validation

Type-check the project:

```bash
npx tsc --noEmit
```
