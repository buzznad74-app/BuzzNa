# BuzzNa D74 - Deployment Guide

## Prerequisites
- Vercel account (free tier OK)
- Supabase account (free tier OK)
- GitHub account with this repo

## Step 1: Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your Supabase dashboard:
   - Navigate to **SQL Editor**
   - Create a new query
   - Copy the entire contents of `SUPABASE_SCHEMA.sql` from this repo
   - Paste it into the SQL editor and click **Run**
   - Wait for all tables to be created (you'll see confirmation)

3. Get your credentials:
   - Go to **Settings > API**
   - Copy: `Project URL` (this is SUPABASE_URL)
   - Copy: `anon public` key (this is VITE_SUPABASE_ANON_KEY)
   - Copy: `service_role` secret (this is SUPABASE_SERVICE_ROLE_KEY)

## Step 2: Deploy to Vercel

1. Push this repo to GitHub (if not already done)
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click **New Project**
4. Import your GitHub repository
5. In the **Environment Variables** section, add:
   ```
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   SUPABASE_ANON_KEY=<your-anon-key>
   GEMINI_API_KEY=<optional-for-ai-forecasting>
   BREVO_API_KEY=<optional-for-email>
   BREVO_SENDER_EMAIL=noreply@buzzna.com
   PAYSTACK_SECRET_KEY=<optional-for-billing>
   NODE_ENV=production
   ```
6. Click **Deploy**
7. Wait for deployment to complete

## Step 3: Test the Deployment

1. Once deployed, Vercel will provide a URL (e.g., `https://buzzna.vercel.app`)
2. Visit that URL in your browser
3. You should see the BuzzNa D74 login screen
4. Click on **BUSINESS REGISTRATION** tab
5. Fill in the registration form:
   - Legal Business Name: Test Business
   - Owner Name: Dantyz
   - Safaricom Phone: +254790435584
   - Email: dan74techmedia@gmail.com
   - Password: TestPass123
6. Click **Register Business**
7. If successful, you'll be logged in and see the Dashboard

## Step 4: Verify Database Sync

1. After registration, go back to your Supabase dashboard
2. Open the **businesses** table
3. You should see your new business record with the correct tenant_id
4. Check **users** table - you should see the owner user

## Live Testing Checklist

- [ ] Business registration completes successfully
- [ ] User can log in with registered credentials
- [ ] Inventory > Add Product works
- [ ] POS > Checkout transaction works
- [ ] Sales > View transactions shows data
- [ ] Settings > License status shows "TRIAL_ACTIVE" (14-day trial)
- [ ] Billing: Paystack integration (optional) allows payment
- [ ] Offline mode works - can still use app without internet
- [ ] When online, data syncs to Supabase

## Billing Tiers Configuration

Billing tiers are defined in the schema. Current active tiers:

1. **TRIAL_ACTIVE**: 14-day free trial (default on registration)
2. **PAYMENT_DUE**: After trial expires
3. **GRACE_PERIOD**: 7 days to make payment after PAYMENT_DUE
4. **SUSPENDED_NON_PAYMENT**: Access blocked if payment not made
5. **FULLY_ACTIVATED**: Paid subscription active

To manually update a business license status in Supabase:
```sql
UPDATE businesses 
SET license_status = 'FULLY_ACTIVATED' 
WHERE tenant_id = 'your-tenant-id';
```

## Troubleshooting

### "Supabase credentials missing"
- Verify environment variables are set in Vercel
- Redeploy after adding env vars

### "Could not find the 'created_at' column"
- This means the database schema wasn't created properly
- Go back to Supabase SQL Editor and run SUPABASE_SCHEMA.sql again

### "503 Gemini API not configured"
- This is OK - AI forecasting is optional
- Only appears if you haven't set GEMINI_API_KEY

### "Paystack initialization failed"
- If PAYSTACK_SECRET_KEY not set, it will use mock transactions for testing
- For production, add your real Paystack key

## Maintenance

### Database Backups
- Supabase automatically backs up daily
- Download backups from Supabase Settings > Backups

### Monitoring
- Check Vercel Analytics for traffic
- Monitor Supabase usage in your project dashboard
- Review logs in Vercel for any errors

## Next Steps

1. Configure email templates (Brevo)
2. Set up Paystack payment gateway for production
3. Add Gemini API key for AI features
4. Customize styling/branding
5. Add more staff users in Settings
6. Configure inventory and pricing

## Support

For issues:
- Check logs: Vercel Dashboard > Deployments > Recent > Logs
- Check Supabase status: supabase.com/status
- Contact: buzznad74@gmail.com | WhatsApp: +254790435584
