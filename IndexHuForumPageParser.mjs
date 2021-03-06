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
        const commentSourcesAscending = [...commentSources].reverse();
        return commentSourcesAscending.map(this._parseHtmlSourceToComment);
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
            commentSources.push(...this._getCommentsFromPage(pageSource));
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
     *         <a href="/User/UserDescription?u=75950" class="art_owner" title="Veter??n"><strong>Asszem</strong></a>
     *         <span> <a rel="license" href="https://forum.index.hu/felhasznalasiFeltetelek" target="license"><img alt="Creative Commons License" title="&copy; Index.hu Zrt." src="/img/licence_index.png" /></a> <a href="/Article/viewArticle?a=16970866&amp;t=9020254" target="_blank" rel="bookmark" title="2000.07.13 21:01:59">2000.07.13</a></span>
     *       </td>
     *       <td class="art_h_m"></td>
     *       <td class="art_h_r">
     *         <a href="/EditArticle/ReplayEditArticle?a=16970866&amp;t=9020254" rel="nofollow" class="art_cnt art_rpl" title="v??lasz" onclick="logReply(this)"></a>
     *         <a href="/Article/viewArticle?a=16970866&amp;t=9020254" rel="nofollow" class="art_vw_shd" onclick="toggleLink(this); return false;" title="a hozz??sz??l??s k??zvetlen linkje"><span class="art_cnt art_vw"></span><span class="art_lnk"><input value="http://forum.index.hu/Article/viewArticle?a=16970866&amp;t=9020254" readonly="readonly"/></span></a>   <span class="art_rat"><span class="art_rat_lft">0</span><a href="/Article/addRating?a=16970866&amp;r=-1" rel="nofollow" class="art_cnt art_rat_ng-i" title="negat??v ??rt??kel??s lead??sa" onclick="return ratingLogin(this);"></a> <a href="/Article/addRating?a=16970866&amp;r=1" rel="nofollow" class="art_cnt art_rat_pl-i" title="pozit??v ??rt??kel??s lead??sa" onclick="return ratingLogin(this);"></a>0</span>
     *         <span class="art_nr">topiknyit??</span>
     *       </td>
     *     </tr>
     *     <tr class="art_b"><td colspan="3"><div class="art_t">Tisztelt aut??sok!
     *     <br><p>Abban a szerencs??ben lehetett r??szem a TOYOTA SAKURA (sz??l??kert u.) j??volt??b??l, hogy magyarorsz??gon els??k k??z??tt pr??b??lhattam ki a PRIUST.
     *     <br><p>Ez az els?? sz??ri??ban forgalmazott hybrid aut??, amit jap??nban, m??r k??t ??ve forgalmaznak.
     *     <br><p>Ott, csup??n 20%-kal dr??g??bb a Coroll??n??l, a korm??ny ad??kedvezm??nyei r??v??n.
     *     <br><p>N??lunk egyel??re nem k??v??nj??k t??mogatni, ??gy kb. 6 milli?? lesz az ??ra. Az aut??ra 5 ??v teljes k??r?? garanci??t v??llalnak.
     *     <br><p>Kicsit t??bbet k??s??bb, k??pekkel.</div></td></tr>
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
        const matchResult = pageSource.match(/Hozz??sz??l??sok: (\d+)/);
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