export type ErrorCode =
  | "E_FCP_NOT_FOUND"
  | "E_FCP_DTD_MISSING"
  | "E_OSASCRIPT_FAILED"
  | "E_PROJECT_NOT_FOUND"
  | "E_PROJECT_INVALID"
  | "E_FCPXML_INVALID"
  | "E_FCPXML_VALIDATION_UNAVAILABLE"
  | "E_DATA_DIR_MISSING"
  | "E_AUTOMATION_DENIED"
  | "E_COMPRESSOR_NOT_FOUND"
  | "E_COMPRESSOR_FAILED"
  | "E_JOB_NOT_FOUND"
  | "E_SETTING_NOT_FOUND"
  | "E_PIXELMATOR_NOT_FOUND"
  | "E_PIXELMATOR_FAILED"
  | "E_LOGIC_NOT_FOUND"
  | "E_MOTION_NOT_FOUND"
  | "E_KEYNOTE_NOT_FOUND"
  | "E_PAGES_NOT_FOUND"
  | "E_NUMBERS_NOT_FOUND"
  | "E_OZML_INVALID"
  | "E_OZML_FILE_MISSING"
  | "E_OZML_PARAM_NOT_FOUND"
  | "E_INTERNAL";

export class CreatorStudioError extends Error {
  readonly code: ErrorCode;
  readonly hint?: string;

  constructor(code: ErrorCode, message: string, hint?: string) {
    super(message);
    this.name = "CreatorStudioError";
    this.code = code;
    this.hint = hint;
  }

  toJSON() {
    return { code: this.code, message: this.message, hint: this.hint };
  }
}

export function isCreatorStudioError(e: unknown): e is CreatorStudioError {
  return e instanceof CreatorStudioError;
}
