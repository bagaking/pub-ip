import {AxiosInstance} from "axios";
import axios from "axios";

const cache: { [baseUrl: string]: AxiosInstance } = {};

function getClient(baseURL: string = "", timeout: number = 17000) {
    let client: AxiosInstance = cache[baseURL];
    if (!client) {
        client = axios.create({
            baseURL,
            timeout,
            responseType: "json",
            headers: {
                "Content-Type": "application/json",
            },
        });
        client.interceptors.request.use(c => c, (error) => {
            return Promise.reject(error);
        });
        cache[baseURL] = client;
    }
    return client;
}

/**
 * get the public IPV4 address
 * @param {string[]} hosts - custom server list
 * @param {number} timeoutMs - timeout in ms, default: 15000ms
 * @return {Promise<string>} ip address
 */
export async function getPublicIP(hosts?: string[], timeoutMs: number = 15000): Promise<string> {
    return await Promise.race([
            "https://ipinfo.io/ip",
            "https://ip.cn",
            "http://icanhazip.com/",
            "http://ident.me/",
            "http://icanhazip.com/",
            "http://tnx.nl/ip",
            "http://ipecho.net/plain",
            "http://diagnostic.opendns.com/myip",
            ...(hosts || [])
        ].map((urlIp: string) => getClient(urlIp, timeoutMs).get("")
            .then(rsp => {
                if (rsp.status !== 200) {
                    throw new Error(`rsp status error, expect 200, got ${rsp.status}`);
                }
                const rspData = rsp.data || (rsp as any).text;
                if (!rspData) {
                    throw new Error(`rsp data error, got empty`);
                }
                return rspData.match(/\d+\.\d+\.\d+\.\d+/)[0];
            }).catch()
        )
    );
}
