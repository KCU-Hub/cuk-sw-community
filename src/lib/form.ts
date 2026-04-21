// Small helpers reused across server actions.

export function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "입력값을 확인해주세요.";
}

// HTML form 의 checkbox 는 선택 시 "on", 비선택 시 아예 누락.
// hidden input 으로 "true"/"false" 문자열을 태우는 경우도 있어 둘 다 받음.
export function formBool(
  formData: FormData,
  key: string,
  defaultValue = false,
): boolean {
  const raw = formData.get(key);
  if (raw === null) return defaultValue;
  const v = String(raw).toLowerCase();
  return v === "on" || v === "true" || v === "1";
}
