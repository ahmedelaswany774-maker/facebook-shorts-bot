import assert from "node:assert";
import { splitIntoSentences } from "./sentenceSplitter.js";

const result = splitIntoSentences("هذه جملة أولى. هذه جملة ثانية؟ وهذه ثالثة!");
assert.strictEqual(result.length, 3);
assert.strictEqual(result[0], "هذه جملة أولى.");

assert.deepStrictEqual(splitIntoSentences("   "), []);

console.log("✅ sentenceSplitter: all checks passed");
