// cat file
import * as compress from "https://deno.land/x/compress@v0.4.6/mod.ts";

const decoder = new TextDecoder("utf-8");

await gitCatFile("6954ef265202b0cabd072ef91f031509b9f51b67");

async function gitCatFile(sha: string) {
  const res = await fetch(
    new URL(
      `./testrepo/.git/objects/${sha.slice(0, 2)}/${sha.slice(2)}`,
      import.meta.url,
    ),
  );
  const blob = await res.arrayBuffer();
  const object = compress.inflate(new Uint8Array(blob));

  let head = 0;
  while (object[head] !== 0) head++;
  const header = decoder.decode(object.slice(0, head));
  const [type] = header.split(" ");
  const objectRest = object.slice(head + 1);

  switch (type) {
    case "commit":
      printCommitObject(objectRest);
      break;
    case "tree":
      printTreeObject(objectRest);
      break;
    case "blob":
      printBlobObject(objectRest);
      break;
    default:
      throw new Error(`Unknown object type: ${type}`);
  }
}

function printCommitObject(data: Uint8Array) {
  console.log(decoder.decode(data));
}

function printTreeObject(data: Uint8Array) {
  let i = 0,
    j = 0;
  while (i < data.length) {
    j = i;
    while (data[j] !== 0) j++;
    const [type, name] = decoder.decode(data.slice(i, j)).split(" ");
    const sha = data.slice(j + 1, j + 21);
    i = j + 21;
    const shaHex = Array.from(sha)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    console.log(
      type.padStart(6, "0"),
      type === "40000" ? "tree" : "blob",
      shaHex,
      name,
    );
  }
}

function printBlobObject(data: Uint8Array) {
  console.log(decoder.decode(data));
}
