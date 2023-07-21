// https://github.com/hwchase17/langchainjs/blob/df0dac452ac8c2ed6288a9285ee916e750f39b15/langchain/src/text_splitter.ts
// modified to work with vanilla javascript, no async support

function lengthFunction(text) {
  return text.length;
}

function splitOnSeparator(text, separator, keepSeparator) {
  let splits;
  if (separator) {
    if (keepSeparator) {
      const regexEscapedSeparator = separator.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
      splits = text.split(new RegExp(`(?=${regexEscapedSeparator})`));
    } else {
      splits = text.split(separator);
    }
  } else {
    splits = text.split("");
  }
  return splits.filter((s) => s !== "");
}

function joinDocs(docs, separator) {
  const text = docs.join(separator).trim();
  return text === "" ? null : text;
}

function mergeSplits(splits, separator, chunkSize, chunkOverlap) {
  const docs = [];
  const currentDoc = [];
  let total = 0;
  for (const d of splits) {
    const _len = lengthFunction(d);
    if (total + _len + (currentDoc.length > 0 ? separator.length : 0) > chunkSize) {
      if (total > chunkSize) {
        console.warn(
          `Created a chunk of size ${total}, which is longer than the specified ${chunkSize}`
        );
      }
      if (currentDoc.length > 0) {
        const doc = joinDocs(currentDoc, separator);
        if (doc !== null) {
          docs.push(doc);
        }
        while (total > chunkOverlap || (total + _len > chunkSize && total > 0)) {
          total -= lengthFunction(currentDoc[0]);
          currentDoc.shift();
        }
      }
    }
    currentDoc.push(d);
    total += _len;
  }
  const doc = joinDocs(currentDoc, separator);
  if (doc !== null) {
    docs.push(doc);
  }
  return docs;
}

// input:
//   text: string
// output:
//   string[]
export function RecursiveTextSplitter(
  text,
  chunkSize = 1000,
  chunkOverlap = 200,
  separators = ["\n\n", "\n", " ", ""],
  keepSeparator = true,
  ) {
  function _splitText(text, separators) {
    const finalChunks = [];
    let separator = separators[separators.length - 1];
    let newSeparators;
    for (let i = 0; i < separators.length; i += 1) {
      const s = separators[i];
      if (s === "") {
        separator = s;
        break;
      }
      if (text.includes(s)) {
        separator = s;
        newSeparators = separators.slice(i + 1);
        break;
      }
    }

    const splits = splitOnSeparator(text, separator, keepSeparator);

    let goodSplits = [];
    const _separator = keepSeparator ? "" : separator;
    for (const s of splits) {
      if (lengthFunction(s) < chunkSize) {
        goodSplits.push(s);
      } else {
        if (goodSplits.length) {
          const mergedText = mergeSplits(goodSplits, _separator, chunkSize, chunkOverlap);
          finalChunks.push(...mergedText);
          goodSplits = [];
        }
        if (!newSeparators) {
          finalChunks.push(s);
        } else {
          const otherInfo = _splitText(s, newSeparators);
          finalChunks.push(...otherInfo);
        }
      }
    }
    if (goodSplits.length) {
      const mergedText = mergeSplits(goodSplits, _separator, chunkSize, chunkOverlap);
      finalChunks.push(...mergedText);
    }
    return finalChunks;
  }

  return _splitText(text, separators);
}
