/**
 * @typedef {Object} Comment
 * @property {int} commentId
 * @property {string} senderName
 * @property {int} senderId
 * @property {Date} dateTime
 * @property {string} bodyHtml
 */
export default class IndexHuForumPageParser {
    /**
     * @param {IndexHuForumPageDownloader} downloader
     * @param {int} commentsPerPage How many comments to put on a page. Minimum is 10, maximum is 500, default is 500.
     * @param {int} waitBetweenRequestsMs Milliseconds to wait between page loads
     */
    constructor(downloader, commentsPerPage = 500, waitBetweenRequestsMs = 1000) {
        this._downloader = downloader;
        this._commentsPerPage = commentsPerPage;
        this._waitBetweenRequestsMs = waitBetweenRequestsMs;
    }

    /**
     * @param {int} topicId
     * @returns {Promise<Comment[]>}
     */
    async getAllCommentsAsJson(topicId) {
        const commentSources = await this._getCommentSources(topicId);
        return commentSources.map(this._parseHtmlSourceToComment);
    }

    /**
     * @param {int} topicId
     * @returns {Promise<string[]>}
     * @private
     */
    async _getCommentSources(topicId) {
        const commentCount = await this._getCommentCount(topicId);
        let currentIndex = 0;
        const commentSources = [];
        while (currentIndex < commentCount) {
            const pageSource = await this._downloader.getPage(topicId, this._commentsPerPage, currentIndex);
            commentSources.unshift(...this._getCommentsFromPage(pageSource));
            currentIndex += this._commentsPerPage;
            await this._sleep(this._waitBetweenRequestsMs)
        }
        return commentSources;
    }

    /**
     * @param {string} html
     * @returns {Comment}
     * @private
     */
    _parseHtmlSourceToComment(html) {
        /* This tool helped: https://regex101.com/ */
        const result = html.match(/<a name="(?<commentId>\d+)".*?\?u=(?<senderId>\d+).*?<strong>(?<senderName>.*?)<\/strong>.*?bookmark" title="(?<dateTimeString>[^"]+)".*?<div class="art_t">(?<bodyHtml>.*)<\/div><\/td><\/tr>/s);
        if (result) {
            return {
                commentId: parseInt(result.groups.commentId),
                senderName: result.groups.senderName,
                senderId: parseInt(result.groups.senderId),
                dateTime: new Date(result.groups.dateTimeString),
                bodyHtml: result.groups.bodyHtml,
            };
        } else {
            throw new Error('Wrong format: ' + html);
        }
    }

    /**
     * @param {string} pageSource
     * @returns {string[]}
     * Example for an item:
     *   <table class="art">
     *     <tr class="art_h">
     *       <td class="art_h_l hasBadge specAge14">
     *         <a name="16970866"></a>
     *         <a href="/User/UserDescription?u=75950" class="art_owner" title="Veterán"><strong>Asszem</strong></a>
     *         <span> <a rel="license" href="https://forum.index.hu/felhasznalasiFeltetelek" target="license"><img alt="Creative Commons License" title="&copy; Index.hu Zrt." src="/img/licence_index.png" /></a> <a href="/Article/viewArticle?a=16970866&amp;t=9020254" target="_blank" rel="bookmark" title="2000.07.13 21:01:59">2000.07.13</a></span>
     *       </td>
     *       <td class="art_h_m"></td>
     *       <td class="art_h_r">
     *         <a href="/EditArticle/ReplayEditArticle?a=16970866&amp;t=9020254" rel="nofollow" class="art_cnt art_rpl" title="válasz" onclick="logReply(this)"></a>
     *         <a href="/Article/viewArticle?a=16970866&amp;t=9020254" rel="nofollow" class="art_vw_shd" onclick="toggleLink(this); return false;" title="a hozzászólás közvetlen linkje"><span class="art_cnt art_vw"></span><span class="art_lnk"><input value="http://forum.index.hu/Article/viewArticle?a=16970866&amp;t=9020254" readonly="readonly"/></span></a>   <span class="art_rat"><span class="art_rat_lft">0</span><a href="/Article/addRating?a=16970866&amp;r=-1" rel="nofollow" class="art_cnt art_rat_ng-i" title="negatív értékelés leadása" onclick="return ratingLogin(this);"></a> <a href="/Article/addRating?a=16970866&amp;r=1" rel="nofollow" class="art_cnt art_rat_pl-i" title="pozitív értékelés leadása" onclick="return ratingLogin(this);"></a>0</span>
     *         <span class="art_nr">topiknyitó</span>
     *       </td>
     *     </tr>
     *     <tr class="art_b"><td colspan="3"><div class="art_t">Tisztelt autósok!
     *     <br><p>Abban a szerencsében lehetett részem a TOYOTA SAKURA (szőlőkert u.) jóvoltából, hogy magyarországon elsők között próbálhattam ki a PRIUST.
     *     <br><p>Ez az első szériában forgalmazott hybrid autó, amit japánban, már két éve forgalmaznak.
     *     <br><p>Ott, csupán 20%-kal drágább a Corollánál, a kormány adókedvezményei révén.
     *     <br><p>Nálunk egyelőre nem kívánják támogatni, így kb. 6 millió lesz az ára. Az autóra 5 év teljes körű garanciát vállalnak.
     *     <br><p>Kicsit többet később, képekkel.</div></td></tr>
     *   </table>
     * @private
     */
    _getCommentsFromPage(pageSource) {
        return [...pageSource.matchAll(/<!-- hozzaszolas start -->(.*?)<!-- hozzaszolas +end -->/sg)].map(result => result[1]);
    }

    /**
     * @param {int} topicId
     * @returns {Promise<int>}
     */
    async _getCommentCount(topicId) {
        const pageSource = await this._downloader.getPage(topicId, 10, 0);
        const matchResult = pageSource.match(/Hozzászólások: (\d+)/);
        return matchResult ? parseInt(matchResult[1]) : undefined;
    }
    /**
     *
     * @param {number} ms Milliseconds to sleep
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}