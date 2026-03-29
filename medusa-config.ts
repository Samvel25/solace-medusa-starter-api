import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils';

loadEnv(process.env.NODE_ENV || 'development', process.cwd());

const dynamicModules = {};

const stripeApiKey = process.env.STRIPE_API_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const isStripeConfigured = Boolean(stripeApiKey) && Boolean(stripeWebhookSecret);

if (isStripeConfigured) {
  console.log('Stripe API key and webhook secret found. Enabling payment module');
  dynamicModules[Modules.PAYMENT] = {
    resolve: '@medusajs/medusa/payment',
    options: {
      providers: [
        {
          resolve: '@medusajs/medusa/payment-stripe',
          id: 'stripe',
          options: {
            apiKey: stripeApiKey,
            webhookSecret: stripeWebhookSecret
          }
        }
      ]
    }
  };
}

const plugins = [];

// Check if S3/DO Spaces is configured
const isS3Configured = Boolean(
  process.env.DO_SPACE_ACCESS_KEY && 
  process.env.DO_SPACE_SECRET_KEY
);

const fileProviders = [];

if (isS3Configured) {
  console.log('✅ S3/DO Spaces file storage enabled');
  fileProviders.push({
    resolve: '@medusajs/file-s3',
    id: 's3',
    options: {
      file_url: process.env.DO_SPACE_URL,
      access_key_id: process.env.DO_SPACE_ACCESS_KEY,
      secret_access_key: process.env.DO_SPACE_SECRET_KEY,
      region: process.env.DO_SPACE_REGION,
      bucket: process.env.DO_SPACE_BUCKET,
      endpoint: process.env.DO_SPACE_ENDPOINT
    }
  });
} else {
  console.log('⚠️  S3 credentials not found. Using local file storage for development.');
  fileProviders.push({
    resolve: '@medusajs/file-local',
    id: 'local',
    options: {
      upload_dir: 'uploads',
      backend_url: process.env.BACKEND_URL || 'http://localhost:9000'
    }
  });
}

const modules = {
  [Modules.FILE]: {
    resolve: '@medusajs/medusa/file',
    options: {
      providers: fileProviders
    }
  },
  [Modules.NOTIFICATION]: {
    resolve: '@medusajs/medusa/notification',
    options: {
      providers: [
        {
          resolve: './src/modules/resend-notification',
          id: 'resend-notification',
          options: {
            channels: ['email'],
            apiKey: process.env.RESEND_API_KEY,
            fromEmail: process.env.RESEND_FROM_EMAIL,
            replyToEmail: process.env.RESEND_REPLY_TO_EMAIL,
            toEmail: process.env.TO_EMAIL,
            enableEmails: process.env.ENABLE_EMAIL_NOTIFICATIONS
          }
        }
      ]
    }
  }
};

module.exports = defineConfig({
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    disable: process.env.DISABLE_MEDUSA_ADMIN === 'true'
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret'
    }
  },
  modules: {
    ...dynamicModules,
    ...modules
  }
});
