import { createHmac, timingSafeEqual } from "node:crypto";
import { fault } from "./supabase.mjs";
export const uuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
export function requiredUUID(value, name = "id") {
  if (!uuid(value))
    throw fault(400, "INVALID_INPUT", `${name} must be a UUID.`);
  return value;
}
export function text(value, name, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw fault(
      400,
      "INVALID_INPUT",
      `${name} is required (maximum ${max} characters).`,
    );
  return value.trim();
}
export function cents(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 100000000)
    throw fault(
      400,
      "INVALID_INPUT",
      `${name} must be positive integer cents (maximum 100000000).`,
    );
  return value;
}
export function safeUrl(value) {
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw 0;
    return url.href;
  } catch {
    throw fault(
      400,
      "INVALID_INPUT",
      "Enter a valid HTTP or HTTPS URL without credentials.",
    );
  }
}
export function revenue(value) {
  const number = Number(value);
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isFinite(number) ||
    number < 0 ||
    number > 9999999999.99 ||
    Math.abs(number * 100 - Math.round(number * 100)) > 0.0001
  )
    throw fault(
      400,
      "INVALID_INPUT",
      "Revenue must be a non-negative amount with at most two decimal places.",
    );
  return number;
}
export function webhookValid(
  rawBody,
  timestamp,
  signature,
  secret,
  now = Date.now(),
) {
  if (
    !secret ||
    !/^\d{10}$/.test(timestamp || "") ||
    !/^[a-f0-9]{64}$/i.test(signature || "")
  )
    return false;
  if (Math.abs(now - Number(timestamp) * 1000) > 300000) return false;
  const expected = createHmac("sha256", secret)
    .update(timestamp + ".")
    .update(rawBody)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
