export function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === "\"") {
        if (input[i + 1] === "\"") {
          value += "\"";
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      value += char;
      i += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      row.push(value);
      value = "";
      i += 1;
      continue;
    }

    if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      i += 1;
      continue;
    }

    if (char === "\r") {
      if (input[i + 1] === "\n") {
        i += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      i += 1;
      continue;
    }

    value += char;
    i += 1;
  }

  row.push(value);
  rows.push(row);

  return rows;
}
