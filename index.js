const papaparse = require("papaparse");
const fs = require("fs");
const uniq = require("lodash/uniq");
const sortedUniq = require("lodash/sortedUniq");
const moment = require("moment");

const csv = fs.readFileSync("covid-19-cases-by-notification-date-and-postcode-local-health-district-and-local-government-area.csv", "utf8");
const parsed = papaparse.parse(csv, {
  header: true
});

const postcodes = uniq(parsed.data.map(row => row.postcode).filter(postcode => postcode && postcode.trim().length > 0 && postcode.trim() !== "0"));
parsed.data.forEach(row => {
  row.moment = moment(row.notification_date, "DD/MM/YYYY");
  row.jsdate = row.moment.valueOf();
});

const dates = sortedUniq(parsed.data.map(row => row.jsdate).filter(date => !Number.isNaN(date)).sort());

const last3Days = [];
const last7Days = [];
const total = [];

let result = "date,postcode,New Cases This Day,New Cases in Last 3 Days,New Cases in Last 7 Days,Total Cases\n";

for (let i = 0; i < postcodes.length; ++i) {
  last3Days[postcodes[i]] = [];
  last7Days[postcodes[i]] = [];
  total[postcodes[i]] = [];
}

for (let i = 0; i < dates.length; ++i) {
  const thisDate = dates[i];
  const thisMoment = moment(thisDate);

  const onThisDate = parsed.data.filter(row => moment(row.notification_date, "DD/MM/YYYY").valueOf() === thisDate);

  for (let j = 0; j < postcodes.length; ++j) {
    const thisPostcode = postcodes[j];
    const inThisPostcode = onThisDate.filter(row => row.postcode === thisPostcode);

    total[thisPostcode].push(...inThisPostcode);

    const lastThreeDays = thisMoment.clone().subtract(2, "days");
    last3Days[thisPostcode] = last3Days[thisPostcode].filter(row => !row.moment.isBefore(lastThreeDays));
    last3Days[thisPostcode].push(...inThisPostcode);

    const lastSevenDays = thisMoment.clone().subtract(6, "days");
    last7Days[thisPostcode] = last7Days[thisPostcode].filter(row => !row.moment.isBefore(lastSevenDays));
    last7Days[thisPostcode].push(...inThisPostcode);

    result += `${thisMoment.toISOString(true)},${thisPostcode},${inThisPostcode.length},${last3Days[thisPostcode].length},${last7Days[thisPostcode].length},${total[thisPostcode].length}\n`;
  }
}

fs.writeFileSync("covid-19-cases-by-notification-date-and-postcode-local-health-district-and-local-government-area-for-terria.csv", result, "utf8");
