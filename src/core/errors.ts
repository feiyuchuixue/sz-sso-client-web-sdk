import type { SsoApiResult } from "./types";

export type SsoCallbackErrorType =
  | "CLIENT_TICKET_LOGIN_UNAVAILABLE"
  | "CLIENT_TICKET_INVALID"
  | "CLIENT_FORBIDDEN"
  | "REDIRECT_INVALID"
  | "SSO_SERVER_UNAVAILABLE"
  | "UNKNOWN";

export const SSO_CALLBACK_ERROR_MESSAGES: Record<SsoCallbackErrorType, string> = {
  CLIENT_TICKET_LOGIN_UNAVAILABLE:
    "Client 后端 Ticket 登录接口不可用，请检查业务系统的 SSO 接入服务是否正常。",
  CLIENT_TICKET_INVALID: "登录凭证已失效，请重新登录。",
  CLIENT_FORBIDDEN: "当前账号无权访问该应用，请联系管理员开通权限。",
  REDIRECT_INVALID: "当前访问入口不在 Client 授权回调范围内，请从合法入口访问。",
  SSO_SERVER_UNAVAILABLE: "认证中心服务暂不可用，请稍后重试。",
  UNKNOWN: "SSO 登录失败，请稍后重试或联系管理员。",
};

export class SsoCallbackError extends Error {
  readonly type: SsoCallbackErrorType;
  readonly rawError: unknown;
  readonly code?: string;
  readonly data?: unknown;

  constructor(
    type: SsoCallbackErrorType,
    rawError?: unknown,
    message?: string,
    errorMessages: Partial<Record<SsoCallbackErrorType, string>> = {},
  ) {
    super(message || errorMessages[type] || SSO_CALLBACK_ERROR_MESSAGES[type]);
    this.name = "SsoCallbackError";
    this.type = type;
    this.rawError = rawError;

    const responsePayload = (rawError as { response?: { data?: Partial<SsoApiResult> } })?.response?.data;
    const payload = responsePayload || (rawError as Partial<SsoApiResult>);
    if (payload && typeof payload === "object") {
      this.code = typeof payload.code === "string" ? payload.code : undefined;
      this.data = payload.data;
    }
  }
}

function getHttpStatus(error: unknown): number | undefined {
  const maybe = error as {
    status?: number;
    response?: { status?: number };
  };
  return maybe?.response?.status ?? maybe?.status;
}

function getBusinessCode(error: unknown): string | undefined {
  const maybe = error as {
    code?: string;
    response?: { data?: { code?: string } };
  };
  return maybe?.response?.data?.code ?? maybe?.code;
}

function getMessage(error: unknown): string {
  if (typeof error === "string") return error;
  const maybe = error as {
    message?: string;
    msg?: string;
    response?: { data?: { message?: string; msg?: string } };
  };
  return maybe?.response?.data?.message ?? maybe?.response?.data?.msg ?? maybe?.message ?? maybe?.msg ?? "";
}

function hasResponse(error: unknown): boolean {
  return !!(error as { response?: unknown })?.response;
}

function isTicketInvalidMessage(message: string): boolean {
  return /ticket|凭证|票据/i.test(message) && /失效|无效|过期|重复|不存在|invalid|expired/i.test(message);
}

export function normalizeTicketLoginError(
  error: unknown,
  errorMessages: Partial<Record<SsoCallbackErrorType, string>> = {},
): SsoCallbackError {
  if (error instanceof SsoCallbackError) {
    return error;
  }

  const status = getHttpStatus(error);
  const code = getBusinessCode(error);
  const message = getMessage(error);

  if (code === "O4031" || code === "S4031") {
    return new SsoCallbackError("CLIENT_FORBIDDEN", error, undefined, errorMessages);
  }

  if (code === "O2002" || code === "S2002") {
    return new SsoCallbackError("REDIRECT_INVALID", error, undefined, errorMessages);
  }

  if (isTicketInvalidMessage(message)) {
    return new SsoCallbackError("CLIENT_TICKET_INVALID", error, undefined, errorMessages);
  }

  if (!hasResponse(error) || status === 500 || status === 502 || status === 503 || status === 504) {
    return new SsoCallbackError("CLIENT_TICKET_LOGIN_UNAVAILABLE", error, undefined, errorMessages);
  }

  return new SsoCallbackError("UNKNOWN", error, message || undefined, errorMessages);
}

export function normalizeSsoServerError(
  error: unknown,
  errorMessages: Partial<Record<SsoCallbackErrorType, string>> = {},
): SsoCallbackError {
  if (error instanceof SsoCallbackError) {
    return error;
  }

  const status = getHttpStatus(error);
  const code = getBusinessCode(error);

  if (code === "O2002" || code === "S2002") {
    return new SsoCallbackError("REDIRECT_INVALID", error, undefined, errorMessages);
  }

  if (!hasResponse(error) || status === 500 || status === 502 || status === 503 || status === 504) {
    return new SsoCallbackError("SSO_SERVER_UNAVAILABLE", error, undefined, errorMessages);
  }

  return new SsoCallbackError("UNKNOWN", error, getMessage(error) || undefined, errorMessages);
}
