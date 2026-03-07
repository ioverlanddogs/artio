export type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

type GoogleApisModule = {
  google?: {
    auth?: {
      JWT?: new (args: { email: string; key: string; scopes: string[] }) => {
        authorize: () => Promise<{ access_token?: string | null }>;
      };
    };
  };
};

export async function getGoogleAccessTokenFromServiceAccount(serviceAccount: GoogleServiceAccount) {
  const dynamicImport = new Function("m", "return import(m)") as (moduleName: string) => Promise<GoogleApisModule>;
  const googleApisModule = await dynamicImport("googleapis").catch(() => null);
  const JWT = googleApisModule?.google?.auth?.JWT;
  if (!JWT) {
    throw new Error("googleapis_unavailable");
  }

  const auth = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  const token = await auth.authorize();
  return token.access_token ?? null;
}
