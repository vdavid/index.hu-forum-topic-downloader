import https from 'https';
import zlib from 'zlib';
//import {httpsForExport as https} from './follow-redirects.mjs';
import fs from 'fs';
import iconv from 'iconv';
import IndexHuForumPageDownloader from './IndexHuForumPageDownloader.mjs';
import IndexHuForumPageParser from './IndexHuForumPageParser.mjs';
import IndexHuForumCommentSaver from './IndexHuForumCommentSaver.mjs';

/**
 * @param {int} topicId
 * @param {string} fileName
 * @returns {Promise<void>}
 */
async function downloadAndSaveTopicToFile(topicId, fileName) {
    const downloader = new IndexHuForumPageDownloader(https, zlib.createGunzip(), iconv.Iconv);
    const parser = new IndexHuForumPageParser(downloader, 500, 3000);
    const saver = new IndexHuForumCommentSaver(fs);
    console.log('Getting comments...');
    const comments = await parser.getAllCommentsAsJson(topicId);
    console.log(`Saving ${comments.length} comments to file...`);
    await saver.saveToFile(topicId, comments, fileName);
    console.log('Download and save done.');
}

export function main() {
    return new Promise(async (resolve, reject) => {
        try {
            const topicId = parseInt(process.argv[2]);
            const success = await downloadAndSaveTopicToFile(topicId, `data/result-${topicId}.html`);
            resolve(success);
        } catch(error) {
            reject(error);
        }
    }).catch(error => console.log(error));
}

main();