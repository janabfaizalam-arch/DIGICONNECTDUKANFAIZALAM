import { createHash, randomBytes } from "node:crypto";

/**
 * Retire the key that came inside the download zip.
 *
 * The zip carries the station's key in plain text and outlives the install —
 * it sits in Downloads, gets emailed, goes onto a pen drive. Anybody holding
 * it could pull this shop's customers' documents. So the first time the
 * program runs on a key it took from a zip, it makes a fresh key of its own,
 * tells the server only the new key's hash, and switches to it. The zip's key
 * is dead from then on, and the real key exists only in this computer's
 * profile.
 *
 * Safe against a lost reply: the new key is saved (as pendingToken) before
 * the server is asked, and if the answer never arrives the next attempt
 * first checks whether the server already took it.
 */
export function newKey() {
  return `dcp_${randomBytes(24).toString("base64url")}`;
}

export function keyHash(key) {
  return createHash("sha256").update(key).digest("hex");
}

export async function secureBundledKey({ config, save, makeApi, log = () => {}, generate = newKey }) {
  // A previous attempt may have succeeded without our hearing the answer.
  if (config.pendingToken) {
    try {
      await makeApi(config.pendingToken).whoami();
      log("success", "Download wali key badal di gayi - ab key sirf is computer me hai.");
      return save({ ...config, agentToken: config.pendingToken, pendingToken: "" });
    } catch (error) {
      if (error?.status !== 401) throw error;
    }
  }

  // Only a key that came from a zip needs retiring.
  if (!config.agentToken || config.agentToken !== config.seededFrom) {
    return config.pendingToken ? save({ ...config, pendingToken: "" }) : config;
  }

  const fresh = config.pendingToken || generate();
  let current = save({ ...config, pendingToken: fresh });

  try {
    await makeApi(current.agentToken).rotateKey(keyHash(fresh));
  } catch (error) {
    if (error?.status !== 409) throw error;
    // "Already changed": by us (reply lost) if the fresh key works.
    try {
      await makeApi(fresh).whoami();
    } catch {
      return current;
    }
  }

  current = save({ ...current, agentToken: fresh, pendingToken: "" });
  log("success", "Download wali key badal di gayi - ab key sirf is computer me hai.");
  return current;
}
