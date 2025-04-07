import dotenv from 'dotenv';
import { cleanEnv, host, num, port, str, testOnly } from 'envalid';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ devDefault: testOnly('test'), choices: ['development', 'production', 'test'] }),
  HOST: host({ devDefault: testOnly('localhost') }),
  PORT: port({ devDefault: testOnly(3000) }),
  // CORS_ORIGIN: str({ devDefault: testOnly('http://localhost:3000') }),
  COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(1000) }),
  COMMON_RATE_LIMIT_WINDOW_MS: num({ devDefault: testOnly(1000) }),

  // AWS DB environment variables
  DEV_AWS_HOST: host(),
  DEV_AWS_USERNAME: str(),
  DEV_AWS_PASSWORD: str(),
  DEV_AWS_DB_NAME: str(),

  // LOCAL DB environment variables
  LOCAL_DB_USERNAME: str(),
  LOCAL_DB_PASSWORD: str(),
  LOCAL_DB_NAME: str(),

  // Razorpay
  RAZORPAY_TEST_KEY_ID: str(),
  RAZORPAY_TEST_KEY_SECRET: str()
});
