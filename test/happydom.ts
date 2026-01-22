import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

// Define build-time constants for tests
// @ts-expect-error Build-time define
globalThis.__API_URL__ = 'http://localhost:3000'
// @ts-expect-error Build-time define
globalThis.__CLERK_PUBLISHABLE_KEY__ = 'pk_test_123'
