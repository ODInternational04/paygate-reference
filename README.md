# PayGate Branch Links

Payment gateway integration with PayGate for Benefit A and Benefit B payments.

## URLs

- `/pay/benefit-a` - Benefit A payment form
- `/pay/benefit-b` - Benefit B payment form

## Environment Variables

Required:
- `PAYGATE_ID` - Your PayGate ID
- `PAYGATE_KEY` - Your PayGate encryption key
- `BASE_URL` - Your public domain (e.g., https://your-app.vercel.app)
- `PORT` - Port number (default: 3000)

**Important for Vercel Deployment:**
You must set these environment variables in your Vercel project settings:
1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add all required variables above
4. Make sure `BASE_URL` matches your Vercel deployment URL
