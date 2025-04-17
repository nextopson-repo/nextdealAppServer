import dotenv from 'dotenv';
import { cleanEnv, host, num, port, str, testOnly, bool } from 'envalid';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ devDefault: testOnly('test'), choices: ['development', 'production', 'test'] }),
  HOST: host({ devDefault: testOnly('localhost') }),
  PORT: port({ devDefault: testOnly(3000) }),
  // CORS_ORIGIN: str({ devDefault: testOnly('http://localhost:3000') }),
  COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(1000) }),
  COMMON_RATE_LIMIT_WINDOW_MS: num({ devDefault: testOnly(1000) }),

  // AWS DB environment variables
  DEV_AWS_HOST: host({ default: 'localhost' }),
  DEV_AWS_USERNAME: str({ default: 'root' }),
  DEV_AWS_PASSWORD: str({ default: 'password' }),
  DEV_AWS_DB_NAME: str({ default: 'nextdeal' }),

  // LOCAL DB environment variables
  LOCAL_DB_HOST: host({ default: 'localhost' }),
  LOCAL_DB_USERNAME: str({ default: 'root' }),
  LOCAL_DB_PASSWORD: str({ default: 'password' }),
  LOCAL_DB_NAME: str({ default: 'nextdeal' }),

  // JWT
  ACCESS_SECRET_KEY: str({ default: 'your_access_secret_key' }),
  REFRESH_SECRET_KEY: str({ default: 'your_refresh_secret_key' }),

  // Razorpay
  RAZORPAY_TEST_KEY_ID: str({ default: '' }),
  RAZORPAY_TEST_KEY_SECRET: str({ default: '' }),

  // SMTP Configuration
  SMTP_HOST: str(),
  SMTP_PORT: num(),
  SMTP_SECURE: bool(),
  SMTP_USER: str(),
  SMTP_PASS: str(),
  SMTP_FROM: str(),
});
