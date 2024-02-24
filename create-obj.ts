import * as compress from "https://deno.land/x/compress@v0.4.6/mod.ts";

const encoder = new TextEncoder();

const content = encoder.encode("hello");
const blobSHA = await writeObject(encodeBlobObject(content));
const tree = encodeTreeObject([
  { mode: "100644", filename: "test", hash: blobSHA },
]);
const treeSHA = await writeObject(tree);
const commit = encodeCommitObject({
  tree: treeSHA,
  author: {
    name: "Moge",
    email: "no@thank.you",
    date: new Date(),
  },
  committer: {
    name: "Moge",
    email: "yes@thank.you",
    date: new Date(),
  },
  message: "test\n",
});
console.log(await writeObject(commit));

async function writeObject(obj: Uint8Array) {
  const sha1 = await crypto.subtle.digest("SHA-1", obj);
  const sha1str = [...new Uint8Array(sha1)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  const dirPath = `./testrepo/.git/objects/${sha1str.slice(0, 2)}`;
  const path = `${dirPath}/${sha1str.slice(2)}`;
  const data = compress.deflate(obj);
  await Deno.mkdir(dirPath, { recursive: true });
  await Deno.writeFile(path, data, { create: true });
  return sha1str;
}

function encodeObject(type: string, body: Uint8Array) {
  const head = encoder.encode(`${type} ${body.length}`);
  const dest = new Uint8Array(head.length + 1 + body.length);
  let p = 0;
  for (let i = 0; i < head.length; i++) dest[p++] = head[i];
  p++;
  for (let i = 0; i < body.length; i++) dest[p++] = body[i];
  return dest;
}

function encodeBlobObject(content: Uint8Array) {
  return encodeObject("blob", content);
}

function encodeTreeObject(
  entries: ReadonlyArray<{ mode: string; filename: string; hash: string }>,
) {
  const bufs = entries.map(({ mode, filename, hash }) => {
    if (!/^[0-9a-f]{40}$/.test(hash)) {
      throw new Error(`Invalid hash: ${hash}`);
    }
    const sha = new Uint8Array(20);
    for (let i = 0; i < 20; i++) {
      sha[i] = Number.parseInt(hash.slice(i * 2, i * 2 + 2), 16);
    }
    const header = encoder.encode(`${mode} ${filename}`);
    const buf = new Uint8Array(header.length + 1 + 20);
    let p = 0;
    for (let i = 0; i < header.length; i++) buf[p++] = header[i];
    p++;
    for (let i = 0; i < sha.length; i++) buf[p++] = sha[i];
    return buf;
  });
  const len = bufs.reduce((pre, cur) => pre + cur.length, 0);
  const dest = new Uint8Array(len);
  let p = 0;
  for (const b of bufs) {
    for (let i = 0; i < b.length; i++) dest[p++] = b[i];
  }
  return encodeObject("tree", dest);
}

type Committer = Readonly<{
  name: string;
  email: string;
  date: Date;
}>;
function encodeCommitObject({
  tree,
  parent,
  author,
  committer,
  message,
}: Readonly<{
  tree: string;
  parent?: string;
  author?: Committer;
  committer?: Committer;
  message: string;
}>) {
  let msg = "";
  msg += `tree ${tree}\n`;
  if (parent) msg += `parent ${parent}\n`;
  if (author) {
    msg += `author ${author.name} <${author.email}> ${
      author.date.getTime() / 1000
    } +0000\n`;
  }
  if (committer) {
    msg += `committer ${committer.name} <${committer.email}> ${
      committer.date.getTime() / 1000
    } +0000\n`;
  }
  msg += `\n${message}`;
  return encodeObject("commit", encoder.encode(msg));
}
