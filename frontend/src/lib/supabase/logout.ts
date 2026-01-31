export async function logout(): Promise<void> {
  const response = await fetch("/auth/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to log out");
  }
}
