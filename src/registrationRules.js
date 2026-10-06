// Small, testable rules used by the registration form.

/** Age in whole years on a given day (default today) for a YYYY-MM-DD birth date. */
export function ageOn(dob, today = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob || ""));
  if (!m) return NaN;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getFullYear() - year;
  const beforeBirthday = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}
