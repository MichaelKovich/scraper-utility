import promiseRetry from 'promise-retry';
import {Page} from 'puppeteer';

const timeout = 1000;
const iv = 100;

const sleep = (page: Page, maxTimeout = 120000) =>
  promiseRetry(
    async retry => {
      try {
        await page.evaluate(iv => {
          return new Promise(resolve => {
            checkReadyState();

            function checkReadyState() {
              if (document.readyState === 'complete') {
                resolve();
              } else {
                setTimeout(checkReadyState, iv);
              }
            }
          });
        }, iv);
      } catch (err) {
        if (
          err.message.indexOf(
            'Cannot find context with specified id undefined'
          ) !== -1
        ) {
          retry(err);
        } else {
          throw err;
        }
      }
    },
    {
      retries: Math.ceil(maxTimeout / timeout),
      minTimeout: timeout,
      maxTimeout: timeout
    }
  );

export default sleep;
