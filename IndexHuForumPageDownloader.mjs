export default class IndexHuForumPageDownloader {
    /**
     * @param {Object} https
     * @param {Object} gunzip
     * @param {Object} iconvClass
     */
    constructor(https, gunzip, iconvClass) {
        this._https = https;
        this._gunzip = gunzip;
        this._iconvClass = iconvClass;
        this._cookies = {};
        this._defaultHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': 'en-US,en;q=0.9,hu;q=0.8',
            'Accept-Charset': 'utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'DNT': '1',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
        };
    }

    /**
     * @param {int} topicId
     * @param {int} commentsPerPage
     * @param {int} startIndex
     * @returns {Promise<string>}
     */
    async getPage(topicId, commentsPerPage, startIndex) {
        const url = this._buildUrl(topicId, commentsPerPage, startIndex);
        if (!Object.keys(this._cookies).length) {
            this._cookies = await this._getSession();
        }
        let result = await this._downloadFile(url);
        while (result.location) {
            result = await this._downloadFile(result.location);
        }
        return result.html;
    }

    _getSession() {
        const cookies = {};
        const url = this._buildUrl(1, 10, 0);
        return new Promise((resolve) => {
            this._https.get(url, {headers: this._defaultHeaders}, response => {
                for (const cookieString of response.headers['set-cookie']) {
                    const match = cookieString.match(/(?<key>[^=]+)=(?<value>[^;]+)/);
                    if (match) {
                        cookies[match.groups.key] = match.groups.value;
                    }
                }
                resolve(cookies);
            });
        });

    }

    /**
     * @param {string} url
     * @returns {Promise<{location: string?, html: string?}>} The page source (HTML) OR a location URL in case of a redirect.
     * @private
     */
    _downloadFile(url) {
        const iconv = new this._iconvClass('Windows-1250', 'UTF-8')
        return new Promise((resolve, reject) => {
            console.log('Getting URL: ' + url);
            this._https.get(url, {
                rejectUnauthorized: false,
                headers: {...this._defaultHeaders, 'Cookie': this._convertObjectToCookieString(this._cookies)}
            }, response => {
//                response.setEncoding('utf8');
                if (response.statusCode === 302) {
                    resolve({location: response.headers.location});
                    return;
                } else if (response.statusCode !== 200) {
                    reject(new Error('Invalid status code: ' + response.statusCode));
                    return;
                }
                let isCompressed = response.headers['content-encoding'] === 'gzip';
                const uncompressedStream = isCompressed ? this._gunzip : response;
                if (isCompressed) {
                    response.pipe(this._gunzip);
                }
                uncompressedStream.pipe(iconv);
                let html = '';
                iconv.on('data', data => {
                    html += data;
                });
                iconv.on('end', () => {
                    resolve({html});
                });
                iconv.on('error', error => {
                    reject(error);
                });
            });
        });
    }

    /**
     * @param {int} topicId
     * @param {int} commentsPerPage
     * @param {int} startIndex
     * @returns {string}
     * @private
     */
    _buildUrl(topicId, commentsPerPage, startIndex) {
        return `https://forum.index.hu/Article/showArticle?na_start=${startIndex}&na_step=${commentsPerPage}&t=${topicId}`;
    }

    /**
     * @param {Object} object
     * @returns {string}
     * @private
     */
    _convertObjectToCookieString(object) {
        return Object.entries(object).map(([key, value]) => key + '=' + value).join('; ');
    }
}