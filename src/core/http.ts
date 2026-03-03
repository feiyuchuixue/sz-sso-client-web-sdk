import axios, { type AxiosInstance } from "axios";
import type { SsoClientConfig, SsoApiResult, SsoLoginResult } from "./types";

/**
 * SDK 内部 HTTP 客户端
 * 仅用于 SSO 相关的两个 API 调用：getSsoAuthUrl / doLoginByTicket
 */
export class SsoHttpClient {
  private http: AxiosInstance;
  private config: SsoClientConfig;

  constructor(config: SsoClientConfig) {
    this.config = config;

    this.http = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: config.httpTimeout,
    });

    // 响应拦截：统一解包
    this.http.interceptors.response.use(
      (response) => {
        const data = response.data as SsoApiResult;
        if (data && data.code === config.successCode) {
          return data as any;
        }
        return Promise.reject(data);
      },
      (error) => Promise.reject(error),
    );
  }

  /**
   * 获取认证中心跳转地址
   * @param clientLoginUrl 当前客户端回调地址，认证中心处理后会跳转回来
   */
  async getSsoAuthUrl(clientLoginUrl: string): Promise<string> {
    const res = await this.http.get<any, SsoApiResult<string>>(
      `${this.config.apiPrefix}/sso/getSsoAuthUrl`,
      { params: { clientLoginUrl } },
    );
    return res.data;
  }

  /**
   * 使用 ticket 换取登录凭证
   */
  async doLoginByTicket(ticket: string): Promise<SsoLoginResult> {
    const res = await this.http.get<any, SsoApiResult<SsoLoginResult>>(
      `${this.config.apiPrefix}/sso/doLoginByTicket`,
      { params: { ticket } },
    );
    return res.data;
  }
}
