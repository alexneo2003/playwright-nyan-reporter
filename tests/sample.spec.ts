import { expect, test } from '@playwright/test';

const arrDescribe = Array.from({ length: 10 }, (_, i) => i + 1);
const arrTest = Array.from({ length: 10 }, (_, i) => i + 1);

for (const i of arrDescribe) {
  test.describe(`Describe ${i}`, () => {
    for (const j of arrTest) {
      test(`Test ${j}`, async () => {
        new Promise((resolve) => setTimeout(resolve, 50));
        if (j % 2 === 0) {
          expect(false).toBeTruthy();
        } else if (j % 5 === 0) {
          test.skip();
        } else {
          expect(true).toBeTruthy();
          new Date().toDateString();
        }
      });
    }
  });
}
