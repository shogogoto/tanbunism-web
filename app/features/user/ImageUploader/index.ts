// Legacy endpoints cannot authenticate the backend's cross-origin session cookie.
// Keep a clear failure for stale clients; never sign or delete arbitrary assets.
export async function deleteImage() {
  return Response.json(
    { error: "Use the authenticated /user/avatar API." },
    { status: 410 },
  );
}

export default async function signUpload() {
  return Response.json(
    { error: "Use the authenticated /user/avatar/sign API." },
    { status: 410 },
  );
}
