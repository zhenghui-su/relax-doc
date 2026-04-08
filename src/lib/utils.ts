import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function nameFromEmail(email: string) {
  return email.split("@")[0] ?? email;
}

export function userColorFromString(value: string) {
  const palette = [
    "#2563eb",
    "#0891b2",
    "#7c3aed",
    "#db2777",
    "#ea580c",
    "#65a30d",
    "#0f766e",
    "#b91c1c",
  ];

  const hash = Array.from(value).reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  return palette[hash % palette.length];
}

export function roleLabel(role: "owner" | "editor" | "viewer") {
  if (role === "owner") {
    return "所有者";
  }

  if (role === "editor") {
    return "可编辑";
  }

  return "只读";
}
