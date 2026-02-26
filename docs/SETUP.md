# Cloudbed Integration - Setup Guide

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database (local or cloud)
- Cloudbed API credentials
- SMTP server for email notifications
- Payment gateway credentials

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- NestJS framework
- Prisma ORM
- Winston logging
- Nodemailer for emails
- Date-fns for date manipulation
- Axios for HTTP requests

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE cloudbed_integration;
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your actual values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cloudbed_integration"

# Application
NODE_ENV=development
PORT=3000

# Cloudbed API
CLOUDBED_API_URL=https://api.cloudbeds.com
CLOUDBED_API_KEY=your_cloudbed_api_key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=noreply@yourhotel.com
MANAGER_EMAIL=manager@yourhotel.com

# Payment Gateway
PAYMENT_GATEWAY_URL=https://api.paymentgateway.com
PAYMENT_GATEWAY_API_KEY=your_payment_api_key
PAYMENT_GATEWAY_SECRET=your_payment_secret
PAYMENT_MAX_RETRIES=3

# Risk Assessment
HIGH_RISK_ROOM_THRESHOLD=4

# Legacy (fallback)
HIGH_RISK_GUEST_THRESHOLD=4

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=15
```

### 4. Initialize Prisma

Generate Prisma client and create database schema:

```bash
npx prisma generate
npx prisma db push
```

Or run migrations:

```bash
npx prisma migrate dev --name init
```

### 5. Start the Application

Development mode with hot reload:

```bash
npm run start:dev
```

Production mode:

```bash
npm run build
npm run start:prod
```

The application will start on `http://localhost:3000`

### 6. Configure Cloudbed Webhook

In your Cloudbed dashboard:

1. Go to Settings → Webhooks
2. Add a new webhook endpoint: `https://your-domain.com/webhook`
3. Subscribe to events:
   - `reservation/created`
   - `reservation/status_changed`
   - `reservation/accommodation_status_changed`
   - `reservation/accommodation_changed`
   - `guest/created`
   - `guest/updated`

## Verification

### Test Webhook Endpoint

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "reservation/created",
    "reservationID": "TEST123",
    "propertyID": "PROP456",
    "startDate": "2024-02-15",
    "endDate": "2024-02-18"
  }'
```

### Check Database

```bash
npx prisma studio
```

This opens a visual database browser at `http://localhost:5555`

### View Logs

Logs are stored in `logs/` directory with daily rotation and 15-day retention.

```bash
tail -f logs/application-2024-01-15.log
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Ensure database exists
- Test connection: `npx prisma db push`

### Webhook Not Receiving Events

- Check firewall settings
- Verify webhook URL is publicly accessible
- Check Cloudbed webhook configuration
- Review application logs

### Email Not Sending

- Verify SMTP credentials
- Check SMTP_HOST and SMTP_PORT
- For Gmail, use App Password instead of regular password
- Test with a simple email client

### Payment Processing Issues

- Verify payment gateway credentials
- Check API key permissions
- Review payment gateway documentation
- Check logs for detailed error messages

## Next Steps

1. Review the SOW documentation in `docs/` folder
2. Customize email templates in `src/email/email.service.ts`
3. Adjust risk assessment thresholds in `src/risk/risk-assessment.service.ts`
4. Configure payment retry intervals in `src/payment/payment.service.ts`
5. Set up monitoring and alerting for production

## Support

For issues or questions:
- Check the docs folder for detailed documentation
- Review the code comments for implementation details
- Contact the development team
