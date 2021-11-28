## Introduction

This is just a small scraper that I wrote for myself to download Hungarian comments related to my car.

## How to use

1. Clone the repository
2. Run `npm install`
3. Run `node index.mjs {topicId}`, where `{topicId}` is the numeric ID of the topic you want to download from index.hu's forum.
   - It'll take about 3 seconds per page, so if your topic is long, bring a coffee or just do something else because it'll take a while.
   - The output will be saved to `./data/result-{topicId}.html`.
