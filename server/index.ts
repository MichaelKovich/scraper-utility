import puppeteer from 'puppeteer';
import csv from 'fast-csv';
import fs from 'fs';

import {email, password} from '../config';
import sleep from './utils';

interface Data {
  name: string;
  url: string;
  employer: string;
  title: string;
}

const readData = () => {
  console.log('Reading data...');
  const csvData: Data[] = [];
  fs.createReadStream(`./data/data.csv`)
    .pipe(csv({headers: true}))
    .on('data', data => {
      console.log('Data: ', data);
      csvData.push(data);
    })
    .on('end', () => scrapeForJobs(csvData));
};

readData();

const writeData = (data: Data[]) => {
  console.log('Writing data...');
  let dataToWrite = data.map(val => [
    val.name,
    val.url,
    val.employer,
    val.title
  ]);
  dataToWrite.unshift(['Name', 'Url', 'Employer', 'Title']);
  const writeStream = fs.createWriteStream('./data/output.csv');
  csv.write(data, {headers: true}).pipe(writeStream);
};

const scrapeForJobs = async (csvData: Data[]) => {
  const jobData = [];

  try {
    console.log('Scraping data...');
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--start-fullscreen', '--window-size=1920,1040']
    });
    const page = await browser.newPage();
    await page.setViewport({width: 1920, height: 1040});

    await page.goto('https://www.linkedin.com');
    await sleep(page, 60000);
    await page.click('#login-email');
    await page.keyboard.type(email);
    await page.click('#login-password');
    await page.keyboard.type(password);
    await page.click('#login-submit');
    await page.waitFor(4000); // To enter security code
    await page.waitForNavigation();

    for (let i = 0; i < csvData.length; i++) {
      await page.goto(csvData[i].url);

      await sleep(page, 60000);

      await page.screenshot({
        path: `./data/screenshots/ss-${i}.png`
      });

      await page.evaluate(_ => {
        window.scrollBy(0, window.innerHeight);
      });

      await page.evaluate(_ => {
        window.scrollBy(0, window.innerHeight);
      });

      const data = await page.evaluate(sel => {
        let title, employer;

        const titleSelector =
          '#ember514 > div.pv-entity__summary-info.pv-entity__summary-info--background-section > h3';
        const employerSelector =
          '#ember514 > div.pv-entity__summary-info.pv-entity__summary-info--background-section > h4.t-16.t-black.t-normal > span.pv-entity__secondary-title';

        title = document.querySelector(titleSelector)!.textContent;
        employer = document.querySelector(employerSelector)!.textContent;

        return {
          name: sel.name,
          url: sel.url,
          employer,
          title
        };
        // @ts-ignore
      }, csvData[i]);

      jobData.push(data);
    }

    await browser.close();
    writeData(jobData);
  } catch (err) {
    console.log(`Scraping has stopped. Error: ${err}`);
  }
};
