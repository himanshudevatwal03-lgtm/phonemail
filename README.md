# PhoneMail

PhoneMail is a mobile-first email application where the phone number becomes the user's identity. This project delivers a working full-stack demo with a responsive mobile experience, a Gmail-inspired desktop shell, and a real PostgreSQL-backed backend.

## Features

- Phone number based signup and login
- OTP generation and verification with password fallback
- Automatic PhoneMail address generation
- Real inbox, sent, drafts, spam, trash, favorites
- Conversations and reply threading
- Search and filter support
- Aliases, profile settings, logout
- Mock or real SMS/email provider support via configuration
- Docker Compose deployment

## Architecture

- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma ORM
- Auth: JWT + OTP/password verification
- Deployment: Docker Compose

## Folder structure

- /frontend
- /backend
- /docker
- docker-compose.yml
- .env.example
- README.md

## Tech stack

- React
- TypeScript
- Tailwind CSS
- Node.js
- Express
- Prisma
- PostgreSQL
- Docker

## Quick start

1. Copy environment variables:
   cp .env.example .env

2. Start services:
   docker compose up -d

3. Open:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## Demo credentials

The seed script creates demo users automatically.

- User 1: phone 9876543210, password password123
- User 2: phone 9123456789, password password123
- Admin demo: phone 9999999999, password password123

PhoneMail IDs are generated automatically from the phone number, for example:
- 9876543210@phonemail.com
- 9123456789@phonemail.com

## Environment variables

See .env.example for all variables. Required values are:
- DATABASE_URL
- JWT_SECRET
- FRONTEND_URL
- BACKEND_URL
- APP_URL

Optional provider variables:
- EMAIL_PROVIDER
- SMTP_* / SENDGRID_API_KEY / MAILGUN_API_KEY
- SMS_PROVIDER, TWILIO_*
- IVR_PROVIDER, TWILIO_IVR_PHONE_NUMBER

## Local development

Backend:
- cd backend
- npm install
- npx prisma generate
- npx prisma db push
- npm run dev

Frontend:
- cd frontend
- npm install
- npm run dev

## Database setup

The app uses PostgreSQL through Prisma. The Docker stack includes PostgreSQL automatically. For local environments, run:

- npx prisma generate
- npx prisma db push

## Seed data

Seed data is inserted automatically on backend startup in development mode. The seed creates:
- demo users
- sample conversations
- sent and received messages
- a few drafts, favorites, spam, and trash entries

## Email provider configuration

If EMAIL_PROVIDER is set to mock, the app logs simulated delivery events instead of sending real emails. To enable real email delivery, configure one of:
- SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
- SENDGRID_API_KEY
- MAILGUN_API_KEY

## SMS provider configuration

If SMS_PROVIDER is mock, the app logs an outbound SMS message instead of sending one. Real Twilio configuration uses:
- SMS_PROVIDER=twilio
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER

## IVR configuration

The IVR module is structured around Twilio-compatible flows. Real telephony features require credentials, but the project includes a mock/demo path for local buildathon use when credentials are unavailable.

## Troubleshooting

- If backend cannot connect to PostgreSQL, verify the DATABASE_URL and that the db service is online.
- If Prisma client errors occur, run: npx prisma generate
- If frontend cannot reach backend, verify VITE_API_URL and backend health endpoint.
- If email or SMS delivery fails, check provider configuration and read logs in the backend container.

## Build and run commands

Docker:
- docker compose up -d
- docker compose logs -f
- docker compose down

Backend:
- cd backend && npm install && npm run build

Frontend:
- cd frontend && npm install && npm run build

## Known limitations

- Real SMS and email delivery require provider credentials.
- IVR is implemented as a structure with a mock fallthrough when credentials are absent.
- The app is designed as a polished buildathon MVP rather than a full enterprise mailbox product.
