import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// vitest запущен без globals, поэтому cleanup регистрируем вручную
afterEach(cleanup);
