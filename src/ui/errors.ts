/** Maps a thrown error to an i18n key. Session errors already carry one ("reject.password"). */
export function errorKey(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/^(reject|join|closed|error)\./.test(message)) return message;
  return "net.error";
}
