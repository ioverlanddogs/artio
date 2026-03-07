export type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

export async function getGoogleAccessTokenFromServiceAccount(serviceAccount: GoogleServiceAccount) {
  const dynamicImport = new Function("m", "return import(m)") as (moduleName: string) => Promise<any>;
  const module = await dynamicImport("googleapis").catch(() => null);
  if (!module?.google?.auth?.JWT) {
    throw new Error("googleapis_unavailable");
  }

  const auth = new module.google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  const token = await auth.authorize();
  return token.access_token ?? null;
}
