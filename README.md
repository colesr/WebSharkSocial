# WebSharkSocial 🦈

A social media platform for WebShark.AI users, creatives and builders to connect and foster community together.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Database](#database)

---

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** v18 or later — [Download](https://nodejs.org/)
- **npm** v9 or later (bundled with Node.js)
- A **Turso** database and auth token for local and hosted environments

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/colesr/WebSharkSocial.git
cd WebSharkSocial
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env.local
```

Then open `.env.local` and set your Turso connection details plus a strong JWT secret (see [Environment Variables](#environment-variables) below).

### 4. Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## Environment Variables

| Variable             | Required | Description                                                                                  |
|----------------------|----------|----------------------------------------------------------------------------------------------|
| `JWT_SECRET`         | Yes      | Secret key used to sign authentication tokens. Must be a strong random string in production. |
| `TURSO_DATABASE_URL` | Yes      | Turso/libSQL database URL, e.g. `libsql://your-db-name-your-org.turso.io`                    |
| `TURSO_AUTH_TOKEN`   | Yes      | Turso auth token used by the app to connect to the hosted database                           |

**Generating a secure `JWT_SECRET`:**

```bash
openssl rand -base64 48
```

Copy the output and set it as the value in `.env.local`, along with your Turso credentials:

```
JWT_SECRET=<your-generated-secret>
TURSO_DATABASE_URL=<your-turso-url>
TURSO_AUTH_TOKEN=<your-turso-token>
```

---

## Running the App

### Development (with hot reload)

```bash
npm run dev
```

Starts the Next.js development server on [http://localhost:3000](http://localhost:3000).

### Production

Build the app first, then start the production server:

```bash
npm run build
npm run start
```

---

## Project Structure

```
WebSharkSocial/
├── src/
│   ├── app/                  # Next.js App Router pages and API routes
│   │   ├── api/              # REST API endpoints (auth, posts, users, me)
│   │   ├── explore/          # Public explore/discover page
│   │   ├── feed/             # Authenticated user feed
│   │   ├── login/            # Login page
│   │   ├── profile/          # User profile pages
│   │   ├── register/         # Registration page
│   │   ├── settings/         # Account settings page
│   │   ├── layout.tsx        # Root layout (navbar, footer)
│   │   └── page.tsx          # Landing/home page
│   ├── components/           # Shared React components
│   ├── lib/
│   │   ├── auth.ts           # JWT auth helpers (sign, verify, cookie management)
│   │   ├── db.ts             # Turso/libSQL client and schema initialization
│   │   └── time.ts           # Time/date utility helpers
│   └── __tests__/            # Jest test suite
├── public/                   # Static assets
├── .env.example              # Example environment variables
├── jest.config.js            # Jest configuration
├── next.config.ts            # Next.js configuration
├── package.json
└── tsconfig.json
```

---

## Available Scripts

| Command           | Description                                      |
|-------------------|--------------------------------------------------|
| `npm run dev`     | Start the development server with hot reload     |
| `npm run build`   | Build the app for production                     |
| `npm run start`   | Start the production server (requires a build)   |
| `npm run lint`    | Run ESLint on the codebase                       |
| `npm run test`    | Run the Jest test suite                          |

---

## Database

WebSharkSocial uses **Turso/libSQL** via [`@libsql/client`](https://docs.turso.tech/sdk/ts/quickstart).

- The app connects to the hosted database using `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
- The schema (users, posts, follows, likes, comments) is initialized automatically on startup.
- This setup works with Vercel and other serverless hosts because the database is remote rather than file-based.

**Tables:**

| Table      | Description                          |
|------------|--------------------------------------|
| `users`    | Registered user accounts             |
| `posts`    | User posts/content                   |
| `follows`  | Follow relationships between users   |
| `likes`    | Post likes                           |
| `comments` | Comments on posts                    |
