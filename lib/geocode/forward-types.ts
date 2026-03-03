export type ForwardGeocodeErrorCode = "not_configured" | "provider_error" | "provider_timeout" | "rate_limited";

export class ForwardGeocodeError extends Error {
  constructor(
    public readonly code: ForwardGeocodeErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ForwardGeocodeError";
  }
}

export type ForwardGeocodeArgs = {
  addressText?: string;
  queryTexts?: string[];
  countryCode?: string;
};
