import fs from "fs";

export default class IndexHuForumCommentSaver {
    /**
     * @param {fs} fs
     */
    constructor(fs) {
        this._fs = fs;
    }

    /**
     * @param {int} topicId
     * @param {Comment[]} comments
     * @param {string} fileName
     * @returns {Promise<void>}
     */
    async saveToFile(topicId, comments, fileName) {
        const html = this._renderHtml(topicId, comments);
        return fs.promises.writeFile(fileName, html);
    }

    /**
     * @param {int} topicId
     * @param {Comment[]} comments
     * @returns {string}
     */
    _renderHtml(topicId, comments) {
        return `<html lang="hu">
               <head>
                 <meta charset="utf-8">
                 <title="Index.hu forum topic ${topicId}"></title>
                 <link rel="stylesheet" href="style.css">
               </head>
               <body>
                 <h1>Topic #${topicId}</h1>
                 <h2>Comments:</h2>
                 <div class="comments">
                 ${comments.map(this._renderComment).join('')}
                 </div>
               </body>
            </html>`;
    }

    /**
     * @param {Comment} comment
     * @returns {string}
     */
    _renderComment(comment) {
        return `<div class="comment">
              <div class="header">#${comment.commentId} – Sender: ${comment.senderName} (#${comment.senderId}) @ ${comment.dateTime.toISOString()}</div>
              <div class="body">
                ${comment.bodyHtml}            
              </div>
            </div>`;
    }
}