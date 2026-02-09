# PayGate Branch Links

Payment gateway integration with PayGate for Benefit A and Benefit B payments.

## URLs

- `/pay/benefit-a` - Benefit A payment form
- `/pay/benefit-b` - Benefit B payment form

## Environment Variables

Required:
- `PAYGATE_ID` - Your PayGate ID
- `PAYGATE_KEY` - Your PayGate encryption key
- `BASE_URL` - Your public domain (e.g., https://yourdomain.co.za)
- `PORT` - Port number (default: 3000)
