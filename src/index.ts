import {AxiosInstance} from "axios";
import axios from "axios";
import * as os from "os";

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

function isPrivate(address: string) {
    return /^(::f{4}:)?10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i
            .test(address) ||
        /^(::f{4}:)?192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(address) ||
        /^(::f{4}:)?172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/i
            .test(address) ||
        /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(address) ||
        /^(::f{4}:)?169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(address) ||
        /^f[cd][0-9a-f]{2}:/i.test(address) ||
        /^fe80:/i.test(address) ||
        /^::1$/.test(address) ||
        /^::$/.test(address);
}

function isPublic(address: string) {
    return !isPrivate(address);
}

function isLoopBack(address: string) {
    return /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/
            .test(address) ||
        /^fe80::1$/.test(address) ||
        /^::1$/.test(address) ||
        /^::$/.test(address);
};

function loopBack(standard: 4 | 6 = 4) {
    if (standard !== 4 && standard !== 6) {
        throw new Error(`loopBack error, expect standard to be 4 or 6, got ${standard}`);
    }
    return standard === 4 ? '127.0.0.1' : 'fe80::1';
}

export function getInternalIP(standard: 4 | 6 = 4): string | null {
    if (standard !== 4 && standard !== 6) {
        throw new Error(`getInternalAddr error, expect standard to be 4 or 6, got ${standard}`);
    }

    const interfaces = os.networkInterfaces();

    const ips = Object.keys(interfaces).map(name => {
        const addresses = interfaces[name].filter(info => {
            const familyGot = info.family.toLowerCase();
            return familyGot === `ipv${standard}`
                && !isLoopBack(info.address);
        });

        return (addresses[0] || {} as any).address;
    }).filter(Boolean);

    return ips[0] || loopBack(standard);
}

export function forMs(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function race<T>(ps: Promise<T>[]) {
    let retIp: T | null = null;
    let count = 0;
    for (let i in ps) {
        ps[i].then(ip => {
            if (!retIp) {
                retIp = ip;
            }
            count += 1;
        }).catch(() => {
            count += 1;
        });
    }
    while (count < ps.length) {
        if(retIp) {
            return retIp;
        }
        await forMs(50);
    }
    return retIp;
}

/**
 * get the public IPV4 address
 * @param {string[]} hosts - custom server list
 * @param {number} timeoutMs - timeout in ms, default: 15000ms
 * @return {Promise<string>} ip address
 */
export async function getExternalIP(hosts?: string[], timeoutMs: number = 15000): Promise<string> {
    return await race([
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
            })
        )
    );
}
