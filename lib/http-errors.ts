export class UnauthorizedError extends Error {
  status = 401;

  constructor(message = "unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;

  constructor(message = "forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class BadRequestError extends Error {
  status = 400;

  constructor(message = "bad_request") {
    super(message);
    this.name = "BadRequestError";
  }
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError || (error instanceof Error && error.message === "unauthorized");
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError || (error instanceof Error && error.message === "forbidden");
}

