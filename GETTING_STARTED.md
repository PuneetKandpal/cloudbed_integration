# How to Start the Project

## Where is package.json?

There is **one** `package.json` at the **root** of the project:

```
hostelworld/          ← OPEN THIS FOLDER in Cursor/VS Code
├── package.json      ← HERE (same level as apps/ and libs/)
├── apps/
├── libs/
└── ...
```

- In Cursor/VS Code: **File → Open Folder** → select the **hostelworld** folder (the one that contains `apps` and `libs`).
- Do **not** open `hostelworld/apps/payment-policy-service` or any subfolder — then you won’t see the root `package.json`.

---

## Steps to start

Run all commands from the **hostelworld** root (where `package.json` is).

### 1. Install dependencies

```bash
cd /Users/anupmacbookair/Desktop/hostelworld
npm install
```

### 2. Start one service

```bash
# Default (booking-service)
npm start

# Or a specific service:
npm run start:booking
npm run start:payment
npm run start:notification
npm run start:cloudbeds
npm run start:audit
```

### 3. Start with watch (auto-reload)

```bash
npm run start:dev:booking
npm run start:dev:payment
# etc.
```

### 4. Build first (optional)

```bash
npm run build
# Or one app:
npm run build:payment
```

---

## Requirements

- **Node.js 18+**
- **MongoDB** running (for booking, payment-policy, notification services)
- **RabbitMQ** running (for all services)

Set env vars if needed (e.g. in `.env` or shell):

- `MONGO_URI=mongodb://localhost:27017`
- `RABBITMQ_URI=amqp://localhost:5672`
