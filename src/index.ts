#!/usr/bin/env node

import { main } from './main';

(async () => {
  try {
    await main();
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
})();
