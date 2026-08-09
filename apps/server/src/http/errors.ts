class HttpValidationError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'HttpValidationError';
    this.field = field;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class PayloadTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Request body exceeds the maximum size of ${maxBytes} bytes`);
    this.name = 'PayloadTooLargeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export { HttpValidationError, PayloadTooLargeError };
